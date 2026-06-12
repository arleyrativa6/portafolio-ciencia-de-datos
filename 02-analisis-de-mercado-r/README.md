# Análisis de mercado y segmentación de clientes (R)

Proyecto de la especialización desarrollado en **R**, sobre el dataset **Mall Customers** (Kaggle). Combina estadística descriptiva, probabilidad y segmentación de clientes para apoyar decisiones de marketing.

## Objetivo

Caracterizar a los clientes de un centro comercial según su edad, ingreso anual y puntaje de gasto, y **segmentarlos en grupos** para orientar estrategias comerciales diferenciadas.

## Qué incluye

1. **Carga y clasificación de variables** (numéricas y categóricas).
2. **Estadística descriptiva y distribuciones** (media, mediana, moda, asimetría).
3. **Probabilidades** simples, conjuntas y condicionales (p. ej. probabilidad de cliente de alto gasto).
4. **Ajuste de distribuciones** con `fitdistrplus`.
5. **Segmentación de clientes** (análisis de clústeres).
6. **Visualización** con `ggplot2`.

## Tecnologías

`R` · `dplyr` · `tidyr` · `ggplot2` · `fitdistrplus` · `cluster` · `skimr` · `moments` · `scales`

## Estructura

```
02-analisis-de-mercado-r/
├── analisis_de_mercado.ipynb          # Notebook en R con el análisis
└── Informe_Analisis_de_Mercado.pdf    # Informe del proyecto
```

## Cómo ejecutar

Requiere R con el kernel **IRkernel** para Jupyter, o abrir el código en RStudio.

```r
install.packages(c("readr","dplyr","tidyr","skimr","moments",
                   "fitdistrplus","ggplot2","scales","purrr","tibble","cluster"))
```
