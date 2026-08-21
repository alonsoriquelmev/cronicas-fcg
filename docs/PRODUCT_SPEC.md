# Crónicas FCG Digital Playtesting Simulator — Product Specification

## 1. Propósito

**Crónicas FCG Digital Playtesting Simulator** es una aplicación web orientada a jugar y realizar playtesting remoto de Crónicas FCG.

El producto busca trasladar la experiencia física del juego a una mesa digital interactiva, manteniendo la flexibilidad necesaria para un juego nuevo cuyas reglas y rulings todavía pueden evolucionar.

El producto NO pretende inicialmente convertirse en un árbitro digital completo.

Principio central:

> **La aplicación representa y sincroniza la mesa. Los jugadores aplican las reglas.**

---

# 2. Problema que resuelve

Crónicas FCG es un juego físico de cartas.

Para probar decks, cartas o interacciones, actualmente los jugadores dependen de:

* disponer físicamente de las cartas;
* encontrarse presencialmente;
* utilizar soluciones genéricas de mesa virtual;
* improvisar mecanismos para probar cartas todavía no impresas;
* reproducir manualmente estados complejos.

El simulador debe permitir que dos jugadores puedan probar Crónicas remotamente desde sus computadores utilizando una interfaz diseñada específicamente para el juego.

---

# 3. Visión del producto

La visión de largo plazo es construir una plataforma digital de Crónicas que pueda evolucionar progresivamente desde:

```text
Mesa digital manual
        ↓
Mesa digital asistida
        ↓
Automatización parcial
        ↓
Rules engine
        ↓
Cliente digital completo
```

La evolución debe ser gradual.

No se debe intentar alcanzar la última etapa prematuramente.

---

# 4. Posicionamiento inicial

La primera versión debe entenderse principalmente como:

> **Una mesa digital multiplayer especializada en Crónicas FCG para jugar y hacer playtesting.**

No debe entenderse inicialmente como:

* cliente competitivo oficial;
* videojuego completamente automatizado;
* plataforma ranked;
* simulador con inteligencia artificial;
* tutorial interactivo;
* sustituto completo del reglamento.

---

# 5. Usuario principal

## Jugador / playtester de Crónicas

El usuario principal:

* ya conoce las reglas básicas de Crónicas;
* posee interés en probar decks;
* quiere jugar remotamente;
* necesita una forma rápida de representar una partida;
* acepta aplicar manualmente efectos y rulings;
* espera una experiencia visual cercana a un videojuego de cartas.

No se debe asumir que necesita tutoriales o asistencia constante.

---

# 6. Usuario secundario

## Equipo de desarrollo / playtesting interno

El producto debe quedar preparado para permitir que desarrolladores o playtesters puedan probar:

* cartas todavía no publicadas;
* versiones corregidas;
* cambios de balance;
* nuevas expansiones;
* nuevas combinaciones de decks.

Para esto, el catálogo debe distinguir conceptualmente cartas como:

```text
RELEASED
TESTING
```

El MVP no necesita implementar todavía un panel administrativo completo para gestionar este contenido.

---

# 7. Usuario futuro

En etapas posteriores pueden incorporarse usuarios como:

* jugadores nuevos;
* jugadores casuales;
* jugadores competitivos;
* organizadores;
* espectadores;
* jueces.

Estos perfiles NO deben condicionar las decisiones de la primera versión.

---

# 8. Caso de uso principal

Dos jugadores quieren probar una partida de Crónicas desde computadores diferentes.

Flujo esperado:

```text
Jugador A
   ↓
abre aplicación
   ↓
selecciona o construye deck
   ↓
crea sala privada
   ↓
comparte link/código
   ↓
Jugador B entra
   ↓
selecciona deck
   ↓
ambos preparan partida
   ↓
ambos juegan
   ↓
la aplicación sincroniza la mesa
```

Los jugadores pueden comunicarse por medios externos durante el MVP.

No es necesario integrar chat.

---

# 9. Responsabilidad de la aplicación

La aplicación se responsabiliza de representar y sincronizar:

* cartas;
* zonas;
* posiciones;
* mano;
* decks;
* Mazo de Esencias;
* Santuario;
* Cementerio;
* Campo;
* Reliquias;
* Versos;
* contadores;
* estado girado;
* estado boca arriba/boca abajo;
* turno;
* fase;
* información pública;
* información privada;
* reconexión;
* estado compartido entre jugadores.

---

# 10. Responsabilidad de los jugadores

En el MVP los jugadores se responsabilizan de:

* verificar legalidad de jugadas;
* pagar costes correctamente;
* aplicar efectos;
* seleccionar objetivos;
* resolver combate;
* aplicar modificadores;
* resolver triggers;
* recordar rulings;
* respetar ventanas de respuesta;
* interpretar textos;
* determinar situaciones especiales.

El software no debe asumir estas responsabilidades salvo que una versión posterior las implemente expresamente.

---

# 11. Principio estructural

El producto debe conocer la **estructura estable del juego** incluso cuando no conoce sus reglas específicas.

Ejemplos:

La aplicación sí debe saber que:

* existe un Mazo Principal;
* existe un Mazo de Esencias separado;
* una Esencia se obtiene desde la parte superior de dicho mazo;
* existen Personajes;
* existen Reliquias;
* existen Versos;
* existe un Santuario;
* existe un Cementerio;
* existe una Mano;
* un Verso puede pasar por una Zona de Resolución;
* una Reliquia puede asociarse a un Personaje;
* una carta puede estar girada.

La aplicación inicialmente NO necesita saber:

* por qué una carta puede jugarse;
* cuándo un Verso es legal;
* cuánto daño debe causar un Personaje;
* si una interacción específica está permitida.

---

# 12. Filosofía ante reglas cambiantes

Crónicas FCG es un juego nuevo.

Algunas reglas y rulings pueden:

* evolucionar;
* aclararse;
* corregirse;
* modificarse;
* ser resueltos directamente por los desarrolladores.

Por lo tanto, el producto debe privilegiar flexibilidad.

Cuando exista una interacción todavía no automatizada, la aplicación debería preferir:

```text
permitir representación manual
```

antes que:

```text
bloquear la interacción
```

por asumir una regla que podría estar incompleta.

---

# 13. Experiencia objetivo

La experiencia debe sentirse como un **TCG digital moderno**, aunque las reglas sean manuales.

No queremos que el usuario perciba:

```text
sitio web
+
imágenes de cartas
+
botones
```

Queremos que perciba:

```text
mesa digital de Crónicas
```

Las cartas deben tener:

* movimiento;
* profundidad;
* peso visual;
* respuesta al cursor;
* transiciones;
* animaciones de zona;
* feedback inmediato.

---

# 14. Dirección visual

El producto utilizará una presentación **2.5D**.

Características:

* tablero con sensación de profundidad;
* jugador propio siempre abajo;
* rival siempre arriba;
* mano en abanico;
* cartas ligeramente inclinadas según posición;
* hover con elevación;
* zoom fluido;
* drag & drop visual;
* slots reactivos;
* animación de robo;
* animación de Esencias;
* tap/untap animado;
* Versos destacados en la zona central;
* feedback visual del Santuario;
* partículas y glow discretos.

No es objetivo inicial construir un entorno 3D completo.

---

# 15. Referencia experiencial

La sensación general puede inspirarse conceptualmente en clientes digitales modernos de TCG, especialmente en:

* fluidez;
* profundidad;
* respuesta visual;
* protagonismo de las cartas;
* presentación cinematográfica de acciones importantes.

No se debe copiar directamente:

* layout;
* identidad visual;
* assets;
* efectos;
* interfaces;
* elementos protegidos

de Hearthstone u otros juegos comerciales.

---

# 16. Plataforma principal

El producto es:

```text
WEB
DESKTOP FIRST
```

Resoluciones objetivo principales:

* 1920×1080;
* 1440×900;
* 1366×768.

El diseño debe adaptarse razonablemente a resoluciones diferentes.

Mobile no es prioridad del MVP.

---

# 17. Mouse first

La interacción principal estará optimizada para mouse.

Interacciones previstas:

```text
Hover
→ inspección rápida

Click
→ seleccionar / ampliar

Drag
→ mover carta

Drop
→ ejecutar movimiento

Double click
→ girar/enderezar cuando corresponda

Right click
→ menú contextual
```

Las interacciones definitivas pueden evolucionar durante pruebas de UX.

---

# 18. Multiplayer

La experiencia principal del producto es:

```text
1 vs 1 remoto
```

Cada jugador utiliza su propio navegador.

Las partidas se crean mediante:

* sala privada;
* código;
* link.

No se requiere matchmaking en el MVP.

---

# 19. Acceso

La primera versión debe minimizar fricción.

No debe ser obligatorio:

* registrarse;
* verificar correo;
* crear perfil;
* configurar colección;
* realizar onboarding extenso.

Idealmente:

```text
abrir
↓
elegir deck
↓
crear / entrar
↓
jugar
```

---

# 20. Identidad temporal

Mientras no existan cuentas, los jugadores utilizan:

* nombre visible temporal;
* identidad de sesión.

La identidad debe ser suficiente para:

* conservar asiento;
* reconectar;
* refrescar el navegador;
* recuperar la perspectiva correcta.

---

# 21. Perspectiva del tablero

Cada jugador siempre se visualiza a sí mismo en la parte inferior.

Jugador A ve:

```text
Jugador B
   ↑
campo rival

────────────

campo propio
   ↓
Jugador A
```

Jugador B ve:

```text
Jugador A
   ↑
campo rival

────────────

campo propio
   ↓
Jugador B
```

No existe una orientación absoluta compartida del tablero.

---

# 22. Información privada

La privacidad forma parte del producto, no solamente de la presentación.

Ejemplos:

* la mano propia es privada;
* la mano rival muestra reversos;
* la inspección del Mazo Principal es privada;
* la preparación del Mazo de Esencias es privada.

El sistema futuro debe evitar entregar información secreta al cliente incorrecto.

---

# 23. Deck Builder

El Deck Builder forma parte de la experiencia principal.

El usuario debe poder:

* explorar catálogo;
* buscar;
* filtrar;
* agregar cartas;
* quitar cartas;
* construir Mazo Principal;
* configurar Arsenal;
* configurar Mazo de Esencias;
* seleccionar Santuario;
* guardar deck;
* cargar deck.

Los decks pueden persistirse localmente durante el MVP.

---

# 24. Catálogo

El catálogo debe ser independiente del motor de reglas.

Una carta posee metadata y contenido.

La existencia de texto como:

```text
Embate
Talento
Prólogo
Epílogo
```

no significa que la aplicación deba interpretarlo automáticamente.

Inicialmente el catálogo puede cargarse desde datos locales estructurados y assets oficiales.

---

# 25. Cartas de testing

El producto debe estar conceptualmente preparado para que una carta pueda estar marcada como:

```text
RELEASED
TESTING
```

Esto permite que versiones futuras del simulador funcionen como herramienta de playtesting interno.

Las cartas `TESTING` no necesitan estar disponibles para todos los usuarios.

---

# 26. Inicio de partida

Antes de comenzar una partida ambos jugadores pasan por una fase de preparación.

Esta preparación puede incluir:

* selección de deck;
* determinación del jugador inicial;
* orden del Mazo de Esencias;
* mano inicial;
* mulligan;
* confirmación READY.

La partida solo comienza cuando ambos jugadores están listos.

---

# 27. Partida

Durante una partida, la aplicación funciona como una mesa digital sincronizada.

La prioridad del sistema es:

```text
representar fielmente estado
+
mantener sincronización
+
proteger información privada
```

antes que validar reglas.

---

# 28. Reconexión

Una desconexión temporal no debe destruir la partida.

Casos esperados:

```text
refresh
pérdida momentánea de red
cierre/reapertura breve
```

El usuario debe poder recuperar:

* sala;
* asiento;
* estado;
* perspectiva.

---

# 29. Abandono

Un jugador puede abandonar manualmente.

El rival debe recibir feedback claro.

Abandonar no necesita activar automáticamente lógica competitiva compleja.

---

# 30. Finalización

Una partida puede finalizar manualmente.

En el MVP no es obligatorio que el sistema determine automáticamente:

* ganador;
* condición de victoria;
* motivo.

Esto podrá incorporarse posteriormente.

---

# 31. Playtesting

La V0.1 prioriza jugar.

No necesita inicialmente dashboards de analytics.

Sin embargo, la arquitectura debe permitir que futuras versiones puedan registrar acciones para obtener:

* duración;
* turnos;
* cartas jugadas;
* frecuencia de cartas;
* daño;
* resultados;
* replays;
* estadísticas de balance.

---

# 32. Roadmap conceptual

La evolución prevista puede seguir aproximadamente:

## Etapa 1 — Mesa digital

* multiplayer;
* decks;
* cartas;
* zonas;
* manipulación manual;
* animaciones;
* sincronización.

## Etapa 2 — Asistencia

* selección explícita Prólogo/Epílogo;
* mejores herramientas de búsqueda;
* Undo negociado;
* historial;
* ayudas contextuales;
* estadísticas básicas.

## Etapa 3 — Automatización parcial

* recursos;
* acciones frecuentes;
* restricciones consolidadas;
* estados derivados;
* ayudas de combate.

## Etapa 4 — Rules Engine

* resolución formal de efectos;
* targets;
* triggers;
* prioridad;
* interacciones;
* condiciones automáticas.

## Etapa 5 — Plataforma

Potencialmente:

* cuentas;
* cloud decks;
* matchmaking;
* ranking;
* torneos;
* espectador;
* replay;
* analytics;
* herramientas para desarrolladores.

Este roadmap es orientativo y no implica compromiso de implementar todas las etapas.

---

# 33. Métrica principal inicial

La principal métrica cualitativa del MVP es:

> **¿Dos jugadores pueden completar cómodamente una partida real de Crónicas usando solamente el simulador como mesa?**

Si la respuesta es sí, el núcleo del producto funciona.

---

# 34. Indicadores de éxito de UX

Durante pruebas se debe observar:

* facilidad para identificar zonas;
* facilidad para leer cartas;
* precisión del drag & drop;
* claridad al asociar Reliquias;
* claridad del estado de Esencias;
* facilidad para gestionar Mano;
* comprensión de la Zona de Resolución;
* claridad del Santuario;
* fluidez de las animaciones;
* ausencia de confusión sobre qué puede manipular cada jugador.

---

# 35. Principios de producto

## P1 — Mesa antes que árbitro

Representar correctamente tiene prioridad sobre automatizar.

## P2 — Estructura estable, reglas flexibles

Modelar conceptos fundamentales sin congelar rulings inestables.

## P3 — Multiplayer desde el origen

No construir una arquitectura local que después deba rehacerse completamente.

## P4 — Información privada real

No depender únicamente de ocultamiento visual.

## P5 — Cartas protagonistas

La experiencia debe sentirse como un juego de cartas.

## P6 — Interacción antes que espectáculo

Una animación nunca debe dificultar jugar.

## P7 — Configurable antes que hardcodeado

Especialmente para datos susceptibles de cambiar.

## P8 — No inventar Crónicas

Las decisiones del producto no deben fabricar reglas que el juego no posee.

## P9 — Iteración rápida

Es preferible construir una base usable y mejorarla con pruebas reales que intentar diseñar el cliente definitivo antes de jugarlo.

## P10 — Preparar el futuro sin implementarlo hoy

La arquitectura puede anticipar multiplayer, replay y rules engine, pero el MVP solo implementa lo necesario.

---

# 36. Relación con otros documentos

Este documento define **qué producto queremos construir**.

Consultar:

```text
MVP_SCOPE.md
```

para saber qué funcionalidades exactas pertenecen a la versión actual.

Consultar:

```text
CRONICAS_DOMAIN.md
```

para entender objetos, zonas y estado.

Consultar:

```text
CRONICAS_RULES.md
```

para reglas confirmadas.

Consultar:

```text
UX_SPEC.md
```

para diseño e interacción.

Consultar:

```text
ARCHITECTURE.md
```

para decisiones técnicas.

`PRODUCT_SPEC.md` no debe utilizarse para inferir funcionalidades fuera del alcance definido por `MVP_SCOPE.md`.
