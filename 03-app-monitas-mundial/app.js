// ===== Config (constantes inmutables) =====
const CFG = {
  sobresPorCaja: 104,
  fichasPorSobre: 7,
};

// Precios por defecto (editables desde "Más")
const DEFAULT_CONFIG = {
  precioCaja: 520000,
  precioSobre: 5000,
  costoCaja: 457600,
  precioAlbum: 0,
  costoAlbum: 0,
  vendeAlbumes: false,
};

const PAGOS_LBL = {
  efectivo: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  bancolombia: "Bancolombia",
  "bre-b": "Bre-B",
  fiado: "Fiado",
};

// ===== State / persistence =====
const STORE_KEY = "monitas-data-v1";
const defaultState = () => ({
  inventory: { cajas: 9, sobresSueltos: 99, albumes: 0 },
  sales: [],
  gastos: [],
  config: { ...DEFAULT_CONFIG },
});
let state = load();

function normalizeState(parsed) {
  const base = defaultState();
  const merged = { ...base, ...(parsed || {}) };
  merged.inventory = { ...base.inventory, ...(parsed?.inventory || {}) };
  merged.config = { ...DEFAULT_CONFIG, ...(parsed?.config || {}) };
  merged.sales = Array.isArray(parsed?.sales) ? parsed.sales : [];
  merged.gastos = Array.isArray(parsed?.gastos) ? parsed.gastos : [];
  return merged;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}
function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

// ===== Utils =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const fmtCOP = (n) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const fmtNum = (n) => new Intl.NumberFormat("es-CO").format(n || 0);

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const startOfDay = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const startOfWeek = () => {
  const x = startOfDay();
  const day = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - day);
  return x;
};
const startOfMonth = () => {
  const x = startOfDay();
  x.setDate(1);
  return x;
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(msg, isError = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 2200);
}

// ===== Sale calculations =====
function precioCajaDe(s) {
  return s.precioCaja ?? state.config?.precioCaja ?? DEFAULT_CONFIG.precioCaja;
}
function precioSobreDe(s) {
  return s.precioSobre ?? state.config?.precioSobre ?? DEFAULT_CONFIG.precioSobre;
}
function costoCajaDe(s) {
  return s.costoCaja ?? state.config?.costoCaja ?? DEFAULT_CONFIG.costoCaja;
}
function precioAlbumDe(s) {
  return s.precioAlbum ?? state.config?.precioAlbum ?? DEFAULT_CONFIG.precioAlbum;
}
function costoAlbumDe(s) {
  return s.costoAlbum ?? state.config?.costoAlbum ?? DEFAULT_CONFIG.costoAlbum;
}
function totalVenta(s) {
  return (
    s.cajas * precioCajaDe(s) +
    s.sobres * precioSobreDe(s) +
    (s.albumes || 0) * precioAlbumDe(s)
  );
}
function gananciaVenta(s) {
  const costoCaja = costoCajaDe(s);
  const costoSobre = costoCaja / CFG.sobresPorCaja;
  return (
    s.cajas * (precioCajaDe(s) - costoCaja) +
    s.sobres * (precioSobreDe(s) - costoSobre) +
    (s.albumes || 0) * (precioAlbumDe(s) - costoAlbumDe(s))
  );
}
function abonado(s) {
  if (!s.abonos) return 0;
  return s.abonos.reduce((sum, a) => sum + (a.amount || 0), 0);
}
function saldo(s) {
  return totalVenta(s) - abonado(s);
}
function isFiadoPendiente(s) {
  return s.metodo === "fiado" && saldo(s) > 0;
}

// ===== Navigation =====
const VIEWS = ["inicio", "vender", "historial", "fiados", "mas"];
const VIEW_TITLES = {
  inicio: { t: "Monitas Mundial", s: "Tu inventario y ventas" },
  vender: { t: "Nueva venta", s: "Registra una venta rápida" },
  historial: { t: "Historial", s: "Ventas registradas" },
  fiados: { t: "Fiados", s: "Pendientes por cobrar" },
  mas: { t: "Más", s: "Reportes y ajustes" },
};

function navigate(view) {
  VIEWS.forEach((v) => {
    $(`#view-${v}`).classList.toggle("hidden", v !== view);
  });
  $$(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.view === view)
  );
  const meta = VIEW_TITLES[view];
  $("#topbar-title").textContent = meta.t;
  $("#topbar-sub").textContent = meta.s;

  if (view === "inicio") renderInicio();
  if (view === "historial") renderHistorial();
  if (view === "fiados") renderFiados();
  if (view === "mas") renderMas();
  if (view === "vender") resetForm();
  window.scrollTo(0, 0);
}

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => navigate(tab.dataset.view));
});

// ===== Inicio =====
function renderInicio() {
  const { cajas, sobresSueltos, albumes = 0 } = state.inventory;
  $("#kpi-cajas").textContent = cajas;
  $("#kpi-sobres").textContent = sobresSueltos;
  const totalSobres = cajas * CFG.sobresPorCaja + sobresSueltos;
  $("#kpi-total-sobres").textContent = fmtNum(totalSobres);
  $("#kpi-fichas").textContent = fmtNum(totalSobres * CFG.fichasPorSobre);

  // Mostrar álbumes solo si los vende
  const showAlb = state.config.vendeAlbumes;
  $("#kpi-albumes-row").classList.toggle("hidden", !showAlb);
  $("#kpi-albumes-row-div").classList.toggle("hidden", !showAlb);
  if (showAlb) $("#kpi-albumes").textContent = albumes;

  const hoy = startOfDay();
  const semana = startOfWeek();
  const mes = startOfMonth();

  let hoyTotal = 0, hoyGan = 0, hoyCajas = 0, hoySobres = 0, hoyAlbumes = 0;
  let semTotal = 0, mesTotal = 0, allTotal = 0, fiadoPend = 0;

  state.sales.forEach((s) => {
    const t = totalVenta(s);
    const g = gananciaVenta(s);
    const d = new Date(s.datetime);
    allTotal += t;
    if (d >= mes) mesTotal += t;
    if (d >= semana) semTotal += t;
    if (d >= hoy) {
      hoyTotal += t;
      hoyGan += g;
      hoyCajas += s.cajas;
      hoySobres += s.sobres;
      hoyAlbumes += s.albumes || 0;
    }
    if (isFiadoPendiente(s)) fiadoPend += saldo(s);
  });

  // Gastos
  let mesGastos = 0, hoyGastos = 0;
  state.gastos.forEach((g) => {
    const d = new Date(g.datetime);
    if (d >= mes) mesGastos += g.amount;
    if (d >= hoy) hoyGastos += g.amount;
  });

  $("#hoy-vendido").textContent = fmtCOP(hoyTotal);
  $("#hoy-ganancia").textContent = fmtCOP(hoyGan - hoyGastos);
  $("#hoy-cajas").textContent = hoyCajas;
  $("#hoy-sobres").textContent = hoySobres;
  $("#resumen-semana").textContent = fmtCOP(semTotal);
  $("#resumen-mes").textContent = fmtCOP(mesTotal);
  $("#resumen-total").textContent = fmtCOP(allTotal);
  $("#resumen-fiado").textContent = fmtCOP(fiadoPend);
  $("#row-fiados").style.display = fiadoPend > 0 ? "" : "none";
  $("#resumen-gastos").textContent = fmtCOP(mesGastos);
}

// ===== Abrir caja =====
$("#btn-abrir-caja").addEventListener("click", () => {
  if (state.inventory.cajas <= 0) {
    toast("No tienes cajas para abrir", true);
    return;
  }
  showModal({
    title: "Abrir una caja",
    body: `Vas a abrir 1 caja: pasarán <strong>${CFG.sobresPorCaja} sobres</strong> al stock de sobres sueltos. Esta acción no es una venta.`,
    actions: [
      { label: "Cancelar", style: "secondary", onClick: closeModal },
      {
        label: "Abrir caja",
        style: "primary",
        onClick: () => {
          state.inventory.cajas -= 1;
          state.inventory.sobresSueltos += CFG.sobresPorCaja;
          save();
          closeModal();
          renderInicio();
          toast("Caja abierta");
        },
      },
    ],
  });
});

// ===== Vender =====
let ventaPago = "efectivo";

function resetForm() {
  $("#qty-cajas").value = 0;
  $("#qty-sobres").value = 0;
  $("#qty-albumes").value = 0;
  $("#precio-caja").value = state.config.precioCaja;
  $("#precio-sobre").value = state.config.precioSobre;

  // Precio/costo álbum: precarga con los valores de la última venta de álbumes
  const lastAlbumSale = state.sales.find((s) => (s.albumes || 0) > 0);
  $("#precio-album").value = lastAlbumSale?.precioAlbum ?? "";
  $("#costo-album").value = lastAlbumSale?.costoAlbum ?? "";

  $("#venta-cliente").value = "";
  $("#venta-abono").value = "";
  $("#venta-notas").value = "";
  ventaPago = "efectivo";
  $$("#pago-group .pill").forEach((p) =>
    p.classList.toggle("active", p.dataset.pago === "efectivo")
  );
  $("#fiado-fields").classList.add("hidden");
  $("#precios-edit").classList.add("hidden");
  $("#btn-toggle-precios").textContent = "✏️ Editar precios de esta venta";
  // Mostrar/ocultar sección de álbumes
  $("#qty-album-block").classList.toggle("hidden", !state.config.vendeAlbumes);
  updateTotal();
}

function getPreciosForm() {
  return {
    precioCaja: parseInt($("#precio-caja").value) || 0,
    precioSobre: parseInt($("#precio-sobre").value) || 0,
    precioAlbum: parseInt($("#precio-album").value) || 0,
    costoAlbum: parseInt($("#costo-album").value) || 0,
  };
}

function updateTotal() {
  const c = parseInt($("#qty-cajas").value) || 0;
  const s = parseInt($("#qty-sobres").value) || 0;
  const a = parseInt($("#qty-albumes").value) || 0;
  const { precioCaja, precioSobre, precioAlbum } = getPreciosForm();
  const total = c * precioCaja + s * precioSobre + a * precioAlbum;
  $("#venta-total").textContent = fmtCOP(total);
}

$$(".qty-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = $(`#qty-${btn.dataset.qty}`);
    const cur = parseInt(target.value) || 0;
    const next = Math.max(0, cur + parseInt(btn.dataset.delta));
    target.value = next;
    updateTotal();
  });
});
$("#qty-cajas").addEventListener("input", updateTotal);
$("#qty-sobres").addEventListener("input", updateTotal);
$("#qty-albumes").addEventListener("input", updateTotal);
$("#precio-caja").addEventListener("input", updateTotal);
$("#precio-sobre").addEventListener("input", updateTotal);
$("#precio-album").addEventListener("input", updateTotal);
$("#costo-album").addEventListener("input", updateTotal);

$("#btn-toggle-precios").addEventListener("click", () => {
  const editor = $("#precios-edit");
  const isHidden = editor.classList.contains("hidden");
  editor.classList.toggle("hidden");
  $("#btn-toggle-precios").textContent = isHidden
    ? "✓ Ocultar precios"
    : "✏️ Editar precios de esta venta";
});

$$("#pago-group .pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    ventaPago = pill.dataset.pago;
    $$("#pago-group .pill").forEach((p) =>
      p.classList.toggle("active", p === pill)
    );
    $("#fiado-fields").classList.toggle("hidden", ventaPago !== "fiado");
  });
});

$("#btn-guardar-venta").addEventListener("click", () => {
  const cajas = parseInt($("#qty-cajas").value) || 0;
  const sobres = parseInt($("#qty-sobres").value) || 0;
  const albumes = parseInt($("#qty-albumes").value) || 0;

  if (cajas <= 0 && sobres <= 0 && albumes <= 0) {
    toast("Indica al menos una caja, sobre o álbum", true);
    return;
  }
  if (cajas > state.inventory.cajas) {
    toast(`Solo tienes ${state.inventory.cajas} cajas`, true);
    return;
  }
  if (sobres > state.inventory.sobresSueltos) {
    toast(
      `Solo tienes ${state.inventory.sobresSueltos} sobres sueltos. Abre una caja primero.`,
      true
    );
    return;
  }
  if (albumes > (state.inventory.albumes || 0)) {
    toast(`Solo tienes ${state.inventory.albumes || 0} álbumes`, true);
    return;
  }

  const { precioCaja, precioSobre, precioAlbum, costoAlbum } = getPreciosForm();
  if (cajas > 0 && precioCaja <= 0) {
    toast("Precio de caja inválido", true);
    return;
  }
  if (sobres > 0 && precioSobre <= 0) {
    toast("Precio de sobre inválido", true);
    return;
  }
  if (albumes > 0 && precioAlbum <= 0) {
    toast("Precio de álbum inválido", true);
    return;
  }
  const total = cajas * precioCaja + sobres * precioSobre + albumes * precioAlbum;
  let cliente = "";
  let abonos = [];

  if (ventaPago === "fiado") {
    cliente = $("#venta-cliente").value.trim();
    if (!cliente) {
      toast("Escribe el nombre del cliente", true);
      return;
    }
    const abonoIni = parseInt($("#venta-abono").value) || 0;
    if (abonoIni < 0 || abonoIni > total) {
      toast("Abono inválido", true);
      return;
    }
    if (abonoIni > 0) {
      abonos.push({
        date: new Date().toISOString(),
        amount: abonoIni,
        method: "efectivo",
      });
    }
  }

  const venta = {
    id: uid(),
    datetime: new Date().toISOString(),
    cajas,
    sobres,
    albumes,
    precioCaja,
    precioSobre,
    precioAlbum,
    costoCaja: state.config.costoCaja,
    costoAlbum,
    metodo: ventaPago,
    cliente,
    abonos,
    notas: $("#venta-notas").value.trim(),
  };

  state.sales.unshift(venta);
  state.inventory.cajas -= cajas;
  state.inventory.sobresSueltos -= sobres;
  state.inventory.albumes = (state.inventory.albumes || 0) - albumes;
  save();
  toast("Venta guardada ✓");
  navigate("inicio");
});

// ===== Historial =====
let historialFiltro = "todos";

$$(".filter-bar .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    historialFiltro = chip.dataset.filter;
    $$(".filter-bar .chip").forEach((c) =>
      c.classList.toggle("active", c === chip)
    );
    renderHistorial();
  });
});

function filtrarVentas() {
  if (historialFiltro === "todos") return state.sales;
  let desde;
  if (historialFiltro === "hoy") desde = startOfDay();
  if (historialFiltro === "semana") desde = startOfWeek();
  if (historialFiltro === "mes") desde = startOfMonth();
  return state.sales.filter((s) => new Date(s.datetime) >= desde);
}

function renderHistorial() {
  const cont = $("#historial-list");
  const ventas = filtrarVentas();
  if (ventas.length === 0) {
    cont.innerHTML = `<div class="empty">Sin ventas en este periodo</div>`;
    return;
  }
  cont.innerHTML = ventas.map(saleHTML).join("");
  attachSaleHandlers(cont);
}

function saleHTML(s) {
  const items = [];
  if (s.cajas > 0) items.push(`${s.cajas} caja${s.cajas > 1 ? "s" : ""}`);
  if (s.sobres > 0) items.push(`${s.sobres} sobre${s.sobres > 1 ? "s" : ""}`);
  if (s.albumes > 0) items.push(`${s.albumes} álbum${s.albumes > 1 ? "es" : ""}`);
  const total = totalVenta(s);
  const isFiado = s.metodo === "fiado";
  const pend = saldo(s);
  let tag;
  if (isFiado && pend > 0) {
    tag = `<span class="sale-tag tag-fiado">Fiado · debe ${fmtCOP(pend)}</span>`;
  } else if (isFiado && pend <= 0) {
    tag = `<span class="sale-tag tag-pagado">Fiado pagado</span>`;
  } else {
    tag = `<span class="sale-tag tag-pago">${PAGOS_LBL[s.metodo]}</span>`;
  }
  const cliente = s.cliente
    ? `<div class="sale-meta">👤 ${escapeHTML(s.cliente)}</div>`
    : "";
  const notas = s.notas
    ? `<div class="sale-meta">📝 ${escapeHTML(s.notas)}</div>`
    : "";

  return `
    <div class="sale" data-id="${s.id}">
      <div class="sale-head">
        <div class="sale-info">
          <div class="sale-items">${items.join(" + ") || "—"}</div>
          <div class="sale-meta">${fmtDateTime(s.datetime)}</div>
          ${cliente}
          ${notas}
          ${tag}
        </div>
        <div class="sale-amount">${fmtCOP(total)}</div>
      </div>
      <div class="sale-actions">
        <button data-act="ver" data-id="${s.id}">Ver detalle</button>
        <button class="danger" data-act="eliminar" data-id="${s.id}">Eliminar</button>
      </div>
    </div>
  `;
}

function attachSaleHandlers(cont) {
  cont.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === "eliminar") confirmEliminarVenta(id);
      if (act === "ver") verDetalleVenta(id);
    });
  });
}

function confirmEliminarVenta(id) {
  const s = state.sales.find((x) => x.id === id);
  if (!s) return;
  const partes = [];
  if (s.cajas) partes.push(`${s.cajas} cajas`);
  if (s.sobres) partes.push(`${s.sobres} sobres`);
  if (s.albumes) partes.push(`${s.albumes} álbumes`);
  showModal({
    title: "¿Eliminar esta venta?",
    body: `Se devolverán ${partes.join(", ") || "0 items"} al inventario. Esta acción no se puede deshacer.`,
    actions: [
      { label: "Cancelar", style: "secondary", onClick: closeModal },
      {
        label: "Eliminar",
        style: "danger",
        onClick: () => {
          state.inventory.cajas += s.cajas;
          state.inventory.sobresSueltos += s.sobres;
          state.inventory.albumes = (state.inventory.albumes || 0) + (s.albumes || 0);
          state.sales = state.sales.filter((x) => x.id !== id);
          save();
          closeModal();
          toast("Venta eliminada");
          renderHistorial();
        },
      },
    ],
  });
}

function verDetalleVenta(id) {
  const s = state.sales.find((x) => x.id === id);
  if (!s) return;
  const total = totalVenta(s);
  const gan = gananciaVenta(s);
  const ab = abonado(s);
  const pend = saldo(s);
  let extra = "";
  if (s.metodo === "fiado") {
    extra = `
      <div class="row" style="display:flex;justify-content:space-between;padding:6px 0;">
        <span>Cliente</span><strong>${escapeHTML(s.cliente || "—")}</strong>
      </div>
      <div class="row" style="display:flex;justify-content:space-between;padding:6px 0;">
        <span>Abonado</span><strong>${fmtCOP(ab)}</strong>
      </div>
      <div class="row" style="display:flex;justify-content:space-between;padding:6px 0;">
        <span>Saldo</span><strong style="color:${pend > 0 ? "#ffb04a" : "#34d399"}">${fmtCOP(pend)}</strong>
      </div>
    `;
  }
  showModal({
    title: "Detalle de venta",
    body: `
      <div style="font-size:14px;line-height:1.7;">
        <div style="display:flex;justify-content:space-between;"><span>Fecha</span><strong>${fmtDateTime(s.datetime)}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span>Cajas</span><strong>${s.cajas}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span>Sobres</span><strong>${s.sobres}</strong></div>
        ${s.albumes ? `<div style="display:flex;justify-content:space-between;"><span>Álbumes</span><strong>${s.albumes}</strong></div>` : ""}
        <div style="display:flex;justify-content:space-between;"><span>Total</span><strong>${fmtCOP(total)}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span>Ganancia</span><strong style="color:#34d399">${fmtCOP(gan)}</strong></div>
        <div style="display:flex;justify-content:space-between;"><span>Pago</span><strong>${PAGOS_LBL[s.metodo]}</strong></div>
        ${extra}
        ${s.notas ? `<div style="margin-top:10px;color:#8a93a8;">📝 ${escapeHTML(s.notas)}</div>` : ""}
      </div>
    `,
    actions: [{ label: "Cerrar", style: "primary", onClick: closeModal }],
  });
}

// ===== Fiados =====
function renderFiados() {
  const pend = state.sales.filter(isFiadoPendiente);
  const totalDeuda = pend.reduce((sum, s) => sum + saldo(s), 0);
  $("#fiados-total").textContent = fmtCOP(totalDeuda);

  const cont = $("#fiados-list");
  if (pend.length === 0) {
    cont.innerHTML = `<div class="empty">No hay fiados pendientes 🎉</div>`;
    return;
  }

  cont.innerHTML = pend
    .map((s) => {
      const total = totalVenta(s);
      const ab = abonado(s);
      const pendMonto = saldo(s);
      const items = [];
      if (s.cajas > 0) items.push(`${s.cajas} caja${s.cajas > 1 ? "s" : ""}`);
      if (s.sobres > 0) items.push(`${s.sobres} sobre${s.sobres > 1 ? "s" : ""}`);
      if (s.albumes > 0) items.push(`${s.albumes} álbum${s.albumes > 1 ? "es" : ""}`);
      const abonosHTML = (s.abonos || [])
        .map(
          (a) =>
            `<div class="abono-row"><span>${fmtDateTime(a.date)} · ${PAGOS_LBL[a.method] || a.method}</span><span>${fmtCOP(a.amount)}</span></div>`
        )
        .join("");
      return `
        <div class="sale" data-id="${s.id}">
          <div class="sale-head">
            <div class="sale-info">
              <div class="sale-items">👤 ${escapeHTML(s.cliente || "—")}</div>
              <div class="sale-meta">${items.join(" + ")} · ${fmtDateTime(s.datetime)}</div>
            </div>
            <div class="sale-amount">${fmtCOP(total)}</div>
          </div>
          <div class="abonos">
            ${abonosHTML || `<div class="abono-row muted">Sin abonos</div>`}
            <div class="saldo-row">
              <span>Saldo pendiente</span>
              <span class="pendiente">${fmtCOP(pendMonto)}</span>
            </div>
          </div>
          <div class="sale-actions">
            <button data-act="abonar" data-id="${s.id}">💵 Registrar abono</button>
            <button data-act="ver" data-id="${s.id}">Detalle</button>
          </div>
        </div>
      `;
    })
    .join("");

  cont.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      if (act === "abonar") registrarAbono(id);
      if (act === "ver") verDetalleVenta(id);
    });
  });
}

function registrarAbono(id) {
  const s = state.sales.find((x) => x.id === id);
  if (!s) return;
  const pend = saldo(s);
  showModal({
    title: "Registrar abono",
    body: `
      <div class="muted small">Saldo pendiente: <strong style="color:#ffb04a">${fmtCOP(pend)}</strong></div>
      <label class="lbl">Monto</label>
      <input type="number" id="modal-abono-monto" inputmode="numeric" placeholder="0" />
      <label class="lbl">Método de pago</label>
      <div class="pill-group" id="modal-pago-group">
        <button class="pill active" data-pago="efectivo">Efectivo</button>
        <button class="pill" data-pago="nequi">Nequi</button>
        <button class="pill" data-pago="daviplata">Daviplata</button>
        <button class="pill" data-pago="bancolombia">Bancolombia</button>
        <button class="pill" data-pago="bre-b">Bre-B</button>
      </div>
    `,
    actions: [
      { label: "Cancelar", style: "secondary", onClick: closeModal },
      {
        label: "Guardar abono",
        style: "primary",
        onClick: () => {
          const monto = parseInt($("#modal-abono-monto").value) || 0;
          if (monto <= 0) return toast("Monto inválido", true);
          if (monto > pend) return toast("Monto mayor al saldo", true);
          const metodo =
            $("#modal-pago-group .pill.active")?.dataset.pago || "efectivo";
          s.abonos = s.abonos || [];
          s.abonos.push({
            date: new Date().toISOString(),
            amount: monto,
            method: metodo,
          });
          save();
          closeModal();
          toast("Abono registrado ✓");
          renderFiados();
        },
      },
    ],
    onShown: () => {
      $$("#modal-pago-group .pill").forEach((p) => {
        p.addEventListener("click", () => {
          $$("#modal-pago-group .pill").forEach((q) =>
            q.classList.toggle("active", q === p)
          );
        });
      });
    },
  });
}

// ===== Más / Reportes =====
function renderMas() {
  const hoy = startOfDay();
  const semana = startOfWeek();
  const mes = startOfMonth();
  let hoyT = 0, semT = 0, mesT = 0, ganT = 0, cajT = 0, sobT = 0, albT = 0;
  state.sales.forEach((s) => {
    const t = totalVenta(s);
    const d = new Date(s.datetime);
    ganT += gananciaVenta(s);
    cajT += s.cajas;
    sobT += s.sobres;
    albT += s.albumes || 0;
    if (d >= mes) mesT += t;
    if (d >= semana) semT += t;
    if (d >= hoy) hoyT += t;
  });
  // Gastos totales
  const gastosT = state.gastos.reduce((sum, g) => sum + g.amount, 0);

  $("#rep-hoy").textContent = fmtCOP(hoyT);
  $("#rep-semana").textContent = fmtCOP(semT);
  $("#rep-mes").textContent = fmtCOP(mesT);
  $("#rep-gastos").textContent = fmtCOP(gastosT);
  $("#rep-ganancia").textContent = fmtCOP(ganT - gastosT);
  $("#rep-cajas").textContent = cajT;
  $("#rep-sobres").textContent = sobT;
  $("#rep-albumes-row").classList.toggle("hidden", !state.config.vendeAlbumes);
  $("#rep-albumes").textContent = albT;

  $("#adj-cajas").value = state.inventory.cajas;
  $("#adj-sobres").value = state.inventory.sobresSueltos;
  $("#adj-albumes").value = state.inventory.albumes || 0;
  $("#adj-albumes-block").classList.toggle("hidden", !state.config.vendeAlbumes);

  $("#cfg-precio-caja").value = state.config.precioCaja;
  $("#cfg-precio-sobre").value = state.config.precioSobre;
  $("#cfg-costo-caja").value = state.config.costoCaja;
  $("#cfg-vende-albumes").checked = !!state.config.vendeAlbumes;

  renderGastosList();
}

function renderGastosList() {
  const cont = $("#gastos-list");
  if (!state.gastos.length) {
    cont.innerHTML = `<div class="empty small">Aún no has registrado gastos</div>`;
    return;
  }
  // Mostrar los últimos 20 gastos
  const last = [...state.gastos]
    .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
    .slice(0, 20);
  cont.innerHTML = last
    .map(
      (g) => `
      <div class="sale" data-id="${g.id}">
        <div class="sale-head">
          <div class="sale-info">
            <div class="sale-items">💸 ${escapeHTML(g.concept)}</div>
            <div class="sale-meta">${fmtDateTime(g.datetime)} · ${PAGOS_LBL[g.metodo] || g.metodo}</div>
            ${g.notas ? `<div class="sale-meta">📝 ${escapeHTML(g.notas)}</div>` : ""}
          </div>
          <div class="sale-amount accent-red">- ${fmtCOP(g.amount)}</div>
        </div>
        <div class="sale-actions">
          <button class="danger" data-act="del-gasto" data-id="${g.id}">Eliminar</button>
        </div>
      </div>`
    )
    .join("");
  cont.querySelectorAll("[data-act='del-gasto']").forEach((b) => {
    b.addEventListener("click", () => confirmEliminarGasto(b.dataset.id));
  });
}

$("#btn-guardar-precios").addEventListener("click", () => {
  const pc = parseInt($("#cfg-precio-caja").value);
  const ps = parseInt($("#cfg-precio-sobre").value);
  const cc = parseInt($("#cfg-costo-caja").value);
  if ([pc, ps, cc].some((v) => isNaN(v) || v < 0)) {
    return toast("Valores inválidos", true);
  }
  state.config.precioCaja = pc;
  state.config.precioSobre = ps;
  state.config.costoCaja = cc;
  save();
  toast("Precios actualizados ✓");
});

$("#btn-guardar-stock").addEventListener("click", () => {
  const c = parseInt($("#adj-cajas").value);
  const s = parseInt($("#adj-sobres").value);
  const a = parseInt($("#adj-albumes").value);
  if (isNaN(c) || isNaN(s) || c < 0 || s < 0) {
    return toast("Valores inválidos", true);
  }
  state.inventory.cajas = c;
  state.inventory.sobresSueltos = s;
  if (state.config.vendeAlbumes && !isNaN(a) && a >= 0) {
    state.inventory.albumes = a;
  }
  save();
  toast("Inventario actualizado ✓");
  renderInicio();
});

// === Álbumes (config) ===
$("#cfg-vende-albumes").addEventListener("change", (e) => {
  state.config.vendeAlbumes = e.target.checked;
  save();
  renderMas();
});

// === Gastos ===
$("#btn-add-gasto").addEventListener("click", () => abrirModalGasto());
$("#btn-add-gasto-home").addEventListener("click", () => abrirModalGasto());

function abrirModalGasto() {
  showModal({
    title: "💸 Registrar gasto",
    body: `
      <label class="lbl">Concepto</label>
      <input type="text" id="modal-gasto-concept" placeholder="Ej: Compra de álbum para Juan" />
      <label class="lbl">Monto</label>
      <input type="number" id="modal-gasto-monto" inputmode="numeric" placeholder="0" />
      <label class="lbl">¿Cómo lo pagaste?</label>
      <div class="pill-group" id="modal-gasto-pago">
        <button class="pill active" data-pago="efectivo">Efectivo</button>
        <button class="pill" data-pago="nequi">Nequi</button>
        <button class="pill" data-pago="daviplata">Daviplata</button>
        <button class="pill" data-pago="bancolombia">Bancolombia</button>
        <button class="pill" data-pago="bre-b">Bre-B</button>
      </div>
      <label class="lbl">¿Aumenta tu stock?</label>
      <div class="pill-group" id="modal-gasto-stock">
        <button class="pill active" data-stock="ninguno">No</button>
        <button class="pill" data-stock="caja">Compré cajas</button>
        <button class="pill" data-stock="sobre">Compré sobres</button>
        <button class="pill" data-stock="album">Compré álbumes</button>
      </div>
      <div id="modal-gasto-stock-qty" class="hidden">
        <label class="lbl">Cantidad</label>
        <input type="number" id="modal-gasto-cantidad" inputmode="numeric" placeholder="0" />
        <p class="muted small" style="margin:6px 4px 0;">El monto del gasto es lo que pagaste por toda la cantidad. Cuando lo vendas, ingresa precio y costo en la venta para ver tu ganancia exacta.</p>
      </div>
      <label class="lbl">Notas <span class="muted">(opcional)</span></label>
      <input type="text" id="modal-gasto-notas" placeholder="" />
    `,
    actions: [
      { label: "Cancelar", style: "secondary", onClick: closeModal },
      {
        label: "Guardar gasto",
        style: "primary",
        onClick: () => {
          const concept = $("#modal-gasto-concept").value.trim();
          const amount = parseInt($("#modal-gasto-monto").value) || 0;
          const metodo =
            $("#modal-gasto-pago .pill.active")?.dataset.pago || "efectivo";
          const stockTipo =
            $("#modal-gasto-stock .pill.active")?.dataset.stock || "ninguno";
          const cantidad = parseInt($("#modal-gasto-cantidad").value) || 0;
          const notas = $("#modal-gasto-notas").value.trim();
          if (!concept) return toast("Escribe un concepto", true);
          if (amount <= 0) return toast("Monto inválido", true);

          const gasto = {
            id: uid(),
            datetime: new Date().toISOString(),
            concept,
            amount,
            metodo,
            notas,
            stockTipo,
            cantidad: stockTipo !== "ninguno" ? cantidad : 0,
          };
          state.gastos.unshift(gasto);
          // Actualizar inventario si corresponde
          if (stockTipo === "caja" && cantidad > 0) {
            state.inventory.cajas += cantidad;
          } else if (stockTipo === "sobre" && cantidad > 0) {
            state.inventory.sobresSueltos += cantidad;
          } else if (stockTipo === "album" && cantidad > 0) {
            state.inventory.albumes = (state.inventory.albumes || 0) + cantidad;
          }
          save();
          closeModal();
          toast("Gasto registrado ✓");
          renderInicio();
          renderMas();
        },
      },
    ],
    onShown: () => {
      $$("#modal-gasto-pago .pill").forEach((p) => {
        p.addEventListener("click", () => {
          $$("#modal-gasto-pago .pill").forEach((q) =>
            q.classList.toggle("active", q === p)
          );
        });
      });
      $$("#modal-gasto-stock .pill").forEach((p) => {
        p.addEventListener("click", () => {
          $$("#modal-gasto-stock .pill").forEach((q) =>
            q.classList.toggle("active", q === p)
          );
          $("#modal-gasto-stock-qty").classList.toggle(
            "hidden",
            p.dataset.stock === "ninguno"
          );
        });
      });
    },
  });
}

function confirmEliminarGasto(id) {
  const g = state.gastos.find((x) => x.id === id);
  if (!g) return;
  const lblStock = { caja: "cajas", sobre: "sobres", album: "álbumes" };
  const aviso =
    g.stockTipo && g.stockTipo !== "ninguno" && g.cantidad > 0
      ? ` También se restarán ${g.cantidad} ${lblStock[g.stockTipo] || "items"} del inventario.`
      : "";
  showModal({
    title: "¿Eliminar gasto?",
    body: `Se eliminará el gasto "${escapeHTML(g.concept)}" por ${fmtCOP(g.amount)}.${aviso}`,
    actions: [
      { label: "Cancelar", style: "secondary", onClick: closeModal },
      {
        label: "Eliminar",
        style: "danger",
        onClick: () => {
          if (g.stockTipo === "caja" && g.cantidad > 0) {
            state.inventory.cajas = Math.max(0, state.inventory.cajas - g.cantidad);
          } else if (g.stockTipo === "sobre" && g.cantidad > 0) {
            state.inventory.sobresSueltos = Math.max(
              0,
              state.inventory.sobresSueltos - g.cantidad
            );
          } else if (g.stockTipo === "album" && g.cantidad > 0) {
            state.inventory.albumes = Math.max(
              0,
              (state.inventory.albumes || 0) - g.cantidad
            );
          }
          state.gastos = state.gastos.filter((x) => x.id !== id);
          save();
          closeModal();
          toast("Gasto eliminado");
          renderMas();
          renderInicio();
        },
      },
    ],
  });
}

$("#btn-exportar").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `monitas-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Respaldo descargado");
});

$("#btn-importar").addEventListener("click", () => $("#file-import").click());
$("#file-import").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(reader.result);
      if (!raw || typeof raw !== "object") throw new Error("Formato inválido");
      const incoming = normalizeState(raw);
      const ventasActuales = state.sales.length;
      const ventasNuevas = incoming.sales.length;
      const aviso =
        ventasActuales > ventasNuevas
          ? `<div style="color:#ffb04a;margin-top:8px;">⚠️ Tienes ${ventasActuales} ventas actualmente y el respaldo solo trae ${ventasNuevas}. Si continúas, perderás las ventas más recientes.</div>`
          : "";
      showModal({
        title: "¿Reemplazar todos los datos?",
        body: `
          El respaldo contiene:
          <ul style="margin:8px 0 0;padding-left:20px;color:#c2cae0;">
            <li><strong>${ventasNuevas}</strong> ventas</li>
            <li>Inventario: ${incoming.inventory.cajas} cajas, ${incoming.inventory.sobresSueltos} sobres</li>
          </ul>
          ${aviso}
        `,
        actions: [
          { label: "Cancelar", style: "secondary", onClick: closeModal },
          {
            label: "Importar",
            style: "primary",
            onClick: () => {
              state = incoming;
              save();
              closeModal();
              toast(`Importado: ${ventasNuevas} ventas ✓`);
              navigate("inicio");
            },
          },
        ],
      });
    } catch (err) {
      console.error(err);
      toast("Archivo inválido", true);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

$("#btn-reset").addEventListener("click", () => {
  showModal({
    title: "¿Borrar todos los datos?",
    body: "Se eliminarán todas las ventas, fiados y se restablecerá el inventario inicial. Esta acción no se puede deshacer.",
    actions: [
      { label: "Cancelar", style: "secondary", onClick: closeModal },
      {
        label: "Borrar todo",
        style: "danger",
        onClick: () => {
          state = defaultState();
          save();
          closeModal();
          toast("Datos borrados");
          navigate("inicio");
        },
      },
    ],
  });
});

// ===== Modal =====
function showModal({ title, body, actions, onShown }) {
  $("#modal-title").innerHTML = title;
  $("#modal-body").innerHTML = body;
  const actionsEl = $("#modal-actions");
  actionsEl.innerHTML = "";
  actions.forEach((a) => {
    const b = document.createElement("button");
    b.className = `btn btn-${a.style}`;
    b.textContent = a.label;
    b.addEventListener("click", a.onClick);
    actionsEl.appendChild(b);
  });
  $("#modal-backdrop").classList.remove("hidden");
  onShown && onShown();
}
function closeModal() {
  $("#modal-backdrop").classList.add("hidden");
}
$("#modal-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "modal-backdrop") closeModal();
});

// ===== Helpers =====
function escapeHTML(str) {
  return String(str || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

// ===== Init =====
navigate("inicio");
