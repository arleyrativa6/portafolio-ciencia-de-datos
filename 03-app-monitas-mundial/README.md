# Monitas Mundial — App de control de ventas (PWA)

[![Demo en vivo](https://img.shields.io/badge/▶_Demo_en_vivo-Abrir_app-2E7D32?style=for-the-badge)](https://arleyrativa6.github.io/portafolio-ciencia-de-datos/03-app-monitas-mundial/)

**Proyecto personal.** Aplicación web progresiva (PWA) instalable en el celular para llevar el control de la venta de **cajas, sobres y álbumes** de fichas del **Mundial 2026**. Pensada para un vendedor real: rápida, sin conexión y sin complicaciones.

> 🔗 **Pruébala aquí:** https://arleyrativa6.github.io/portafolio-ciencia-de-datos/03-app-monitas-mundial/

## Funcionalidades

- 📊 **Inicio (KPIs):** inventario de cajas y sobres, ventas y ganancia del día, resumen por semana/mes y total histórico.
- 💵 **Vender:** registro de ventas por cantidad, con métodos de pago colombianos (**Efectivo, Nequi, Daviplata, Bancolombia, Bre-B, Fiado**) y precios editables por venta.
- 📋 **Historial:** lista de ventas con filtros por día, semana y mes.
- 📒 **Fiados:** control de ventas a crédito y total por cobrar.
- ⚙️ **Más:** reportes, gastos, precios por defecto, ajuste de inventario y **respaldo (exportar/importar JSON)**.

## Tecnologías

- **JavaScript puro** (sin frameworks), **HTML** y **CSS**.
- **PWA** instalable (`manifest.json`, diseño *mobile-first*, modo standalone).
- **Persistencia local** con `localStorage` — funciona **sin backend ni conexión**.

## Cómo usar

Al ser archivos estáticos, basta con abrir `index.html` en el navegador. Para usarla como app en el celular, conviene servirla por HTTP:

```bash
# Desde esta carpeta
python -m http.server 8000
# Luego abrir http://localhost:8000 en el navegador del celular
```

En el celular: menú del navegador → **"Agregar a la pantalla de inicio"** para instalarla como aplicación.

## Estructura

```
03-app-monitas-mundial/
├── index.html      # Estructura y vistas
├── app.js          # Lógica (ventas, inventario, fiados, reportes, respaldo)
├── styles.css      # Estilos mobile-first
├── manifest.json   # Configuración PWA
└── icon.svg        # Ícono de la app
```
