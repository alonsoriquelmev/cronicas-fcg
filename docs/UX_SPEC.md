# Crónicas FCG — UX Specification

## 1. Propósito

Este documento define la experiencia de usuario, interacción visual y comportamiento de interfaz del **Crónicas FCG Digital Playtesting Simulator**.

Su objetivo es asegurar que la aplicación se sienta como un **videojuego digital de cartas 2.5D**, no como un dashboard, CRUD o página web con imágenes estáticas.

La UX debe priorizar:

1. claridad de estado;
2. precisión de interacción;
3. fluidez;
4. legibilidad;
5. feedback visual;
6. sensación de juego;
7. espectacularidad visual moderada.

Principio rector:

> **La interacción correcta siempre tiene prioridad sobre la animación.**

---

# 2. Plataforma prioritaria

La experiencia principal es:

```text
WEB
DESKTOP FIRST
MOUSE FIRST
```

Resoluciones prioritarias:

- 1920×1080
- 1440×900
- 1366×768

Debe existir adaptación razonable a otras resoluciones de escritorio.

Mobile no es prioridad de V0.1.

No deformar la experiencia desktop para optimizar pantallas pequeñas.

---

# 3. Dirección visual general

La aplicación debe transmitir:

- profundidad;
- peso visual de las cartas;
- mesa de juego;
- respuesta inmediata;
- movimiento;
- energía;
- claridad competitiva;
- estética premium.

La referencia conceptual puede ser la sensación de clientes digitales modernos de TCG, especialmente en:

- respuesta al cursor;
- profundidad;
- transiciones;
- protagonismo de cartas;
- presentación de acciones importantes.

No copiar directamente:

- layouts;
- assets;
- sonidos;
- efectos;
- UI;
- identidad visual

de Hearthstone u otros juegos comerciales.

---

# 4. Filosofía 2.5D

La aplicación NO necesita un motor 3D completo.

La sensación de profundidad debe lograrse principalmente mediante:

- perspectiva ligera;
- escalado;
- sombras;
- rotaciones;
- transformaciones CSS;
- parallax discreto;
- animaciones spring;
- hover lift;
- tilt;
- desplazamiento entre zonas;
- capas visuales.

El tablero debe sentirse como una superficie de juego, no como una grilla plana.

---

# 5. Jerarquía visual

Prioridad visual:

1. cartas;
2. estado del campo;
3. Santuario;
4. Esencias;
5. Mano;
6. Zona de Resolución;
7. turno/fase;
8. acciones secundarias;
9. utilidades;
10. decoración.

Los controles secundarios nunca deben competir visualmente con las cartas.

---

# 6. Perspectiva de jugador

Cada cliente debe orientar siempre la mesa desde la perspectiva del usuario local.

El jugador local aparece abajo.

El rival aparece arriba.

Ejemplo:

```text
             RIVAL

       Campo rival
  Santuario / Esencias

────────────────────────

  Santuario / Esencias
       Campo propio

            YO

        Mi Mano
```

No existe una orientación absoluta del tablero compartida entre jugadores.

---

# 7. Estructura general del tablero

La mesa debe contener visualmente:

- zona rival;
- campo rival;
- Zona de Resolución central;
- campo propio;
- zona propia;
- mano propia.

Debe evitarse una composición excesivamente rectangular o de dashboard.

Se recomienda una ligera perspectiva hacia el centro del tablero.

---

# 8. Campo

El Campo debe verse abierto.

No mostrar una grilla fija de slots vacíos.

Los slots aparecen dinámicamente a medida que existen Personajes.

Campo vacío:

```text
────────────────────────────────────
             CAMPO
────────────────────────────────────
```

Con Personajes:

```text
[ Personaje ] [ Personaje ] [ Personaje ]
```

Los slots deben:

- compactarse automáticamente;
- mantener separación clara;
- poder reordenarse;
- responder visualmente al drag;
- no usar coordenadas X/Y persistentes.

---

# 9. Slot de Personaje

Cada Personaje genera un slot dinámico.

El slot debe contener:

```text
Personaje
+
0..N Reliquias asociadas
```

Conceptualmente:

```text
┌─────────────────┐
│    PERSONAJE    │
│                 │
│     [Carta]     │
│                 │
│ [R] [R] [R]     │
└─────────────────┘
```

El contenedor no debe sentirse como una tarjeta administrativa.

Debe percibirse como una agrupación visual natural del campo.

---

# 10. Reliquias

Una Reliquia puede estar:

- asociada a un Personaje;
- sin portador.

Las Reliquias asociadas deben aparecer visualmente vinculadas al Personaje.

La asociación debe ser inequívoca.

Puede utilizarse:

- proximidad;
- alineación;
- solapamiento controlado;
- conectores discretos;
- glow al hacer drag.

No depender únicamente de texto.

---

# 11. Reliquias sin portador

Las Reliquias sin portador deben permanecer visibles en una franja o área del Campo.

No necesitan una caja grande con el título “Reliquias sin portador”.

La ubicación debe hacer evidente que:

- están en Campo;
- no pertenecen actualmente a ningún Personaje.

---

# 12. Mano

La Mano es uno de los elementos visuales más importantes.

Debe aparecer en la zona inferior.

Presentación recomendada:

- abanico;
- ligero solapamiento;
- rotación progresiva;
- profundidad;
- carta central más recta;
- extremos ligeramente inclinados.

Ejemplo conceptual:

```text
     /[C]\  /[C]\  [C]  /[C]\  /[C]\
```

La mano debe adaptarse a cantidades altas de cartas.

---

# 13. Orden de Mano

Las cartas NO pueden reordenarse manualmente.

La UI ordena automáticamente por tipo.

Orden inicial:

```text
CHARACTER
VERSE
RELIC
otros tipos aplicables
```

Dentro de cada grupo debe mantenerse un orden determinista.

Los grupos pueden diferenciarse visualmente de forma sutil.

No agregar títulos grandes que ocupen espacio innecesario.

---

# 14. Hover de carta

Al pasar el cursor sobre una carta interactuable:

- elevarla ligeramente;
- aumentar escala;
- incrementar sombra;
- mejorar contraste;
- aplicar tilt suave opcional;
- llevarla sobre cartas adyacentes mediante z-index.

El hover debe sentirse inmediato.

No usar animaciones lentas.

---

# 15. Inspección de carta

Click sobre una carta debe permitir verla ampliada.

La vista ampliada debe:

- mostrar la carta en alta resolución;
- respetar proporción;
- permitir leer texto;
- oscurecer discretamente el fondo;
- cerrarse fácilmente.

No bloquear innecesariamente la partida durante demasiado tiempo.

Puede cerrarse mediante:

- click fuera;
- botón;
- Escape.

---

# 16. Drag & Drop

El drag & drop es una interacción central.

Debe sentirse:

- fluido;
- preciso;
- directo;
- sin saltos;
- sin delay perceptible.

Mientras una carta se arrastra:

- elevar visualmente;
- aumentar sombra;
- reducir conexión visual con zona original;
- seguir el cursor con suavidad;
- mantener suficiente tamaño para identificarla.

---

# 17. Drop targets

Cuando una carta se aproxima a una zona válida:

- destacar el destino;
- utilizar glow;
- variar borde;
- modificar profundidad;
- ofrecer feedback claro.

No sobrecargar con efectos.

Una zona inválida no debe parecer aceptable.

---

# 18. Snap visual

Al soltar una carta en un destino válido:

- debe alinearse naturalmente;
- utilizar transición breve;
- evitar teletransportación brusca;
- mostrar sensación de “encaje”.

El estado real de la partida no depende de la animación.

---

# 19. Movimiento entre zonas

Los cambios de zona importantes deberían tener transiciones espaciales coherentes.

Ejemplos:

```text
Deck → Mano
Mano → Campo
Campo → Cementerio
Mano → Resolución
Essence Deck → Essence Zone
```

El usuario debe poder percibir de dónde salió y dónde terminó una carta.

---

# 20. Animación de robo

`DRAW_CARD` debe representarse como un movimiento desde el Mazo Principal hacia la Mano.

Conceptualmente:

```text
Deck
  \
   \
   [Carta]
      \
       Mano
```

La carta puede entrar inicialmente mostrando el reverso y revelarse al propietario al incorporarse a la mano.

La animación debe ser breve.

---

# 21. Animación de Esencia

`DRAW_ESSENCE` debe mostrar claramente:

```text
Essence Deck
      ↓
Essence Zone
```

La Esencia debe:

- desplazarse desde su mazo;
- revelarse;
- aterrizar en la Zona de Esencias;
- recibir feedback visual ligero.

---

# 22. Zona de Esencias

Debe mostrar claramente:

- qué Esencias están disponibles;
- cuáles están giradas;
- cantidad desplegada.

No debe parecer una segunda Mano.

Puede organizarse horizontalmente.

Cuando existan muchas cartas puede:

- compactarse;
- solaparse ligeramente;
- permitir adaptación horizontal.

No permitir drag libre hacia otras zonas.

---

# 23. Tap / Untap

Girar debe utilizar una rotación animada cercana a 90°.

No cambiar instantáneamente la orientación.

`TAP_CARD`:

```text
0° → 90°
```

`UNTAP_CARD`:

```text
90° → 0°
```

Utilizar easing/spring suave.

La animación debe ser suficientemente rápida para acciones repetitivas.

---

# 24. Boca arriba / boca abajo

El cambio debe visualizarse como flip.

No reemplazar instantáneamente imagen frontal por reverso.

Puede utilizar:

- rotación Y;
- cambio de asset a mitad de animación.

Evitar efectos 3D exagerados.

---

# 25. Carta boca abajo propia

El propietario debe poder identificar su propia carta boca abajo.

La UI puede mostrar:

- frontal atenuado;
- pequeño indicador;
- preview privada al hover;
- otra solución clara.

El rival solo debe ver reverso.

La privacidad no debe depender exclusivamente del CSS.

---

# 26. Zona de Resolución de Versos

La Zona de Resolución debe ubicarse cerca del centro de la mesa.

Debe tener mayor protagonismo visual que una zona normal.

Cuando entra un Verso:

- desplazarse desde la Mano;
- aumentar ligeramente de escala;
- centrarse;
- elevarse visualmente;
- permitir lectura por ambos jugadores.

Ejemplo:

```text
           ✦
        [VERSO]
           ✦
```

Después de resolución:

```text
VERSE_RESOLUTION
       ↓
GRAVEYARD
```

---

# 27. Prólogo / Epílogo

La arquitectura visual debe quedar preparada para una futura selección explícita:

```text
PRÓLOGO
EPÍLOGO
```

Cuando se implemente:

- mostrar ambas opciones;
- hacer clara la selección;
- no tapar innecesariamente el tablero;
- registrar visualmente cuál se está resolviendo.

V0.1 puede mantener esta elección manual si el alcance funcional así lo requiere.

---

# 28. Santuario

El Santuario debe sentirse como un elemento central del jugador.

Debe mostrar:

- carta;
- vida actual;
- controles discretos.

Ejemplo:

```text
[SANTUARIO]

[-] 17 [+]
```

No convertirlo en un widget administrativo dominante.

---

# 29. Feedback de vida del Santuario

Cuando cambia la vida:

- animar número;
- mostrar delta temporal;
- aplicar pequeño shake o impacto;
- opcionalmente glow breve.

Ejemplo:

```text
20
↓
-3
↓
17
```

La UI solo representa el cambio solicitado.

No calcula automáticamente daño.

---

# 30. Contador genérico

Una carta con contador debe mostrarlo de forma visible sin tapar demasiado su arte.

Ejemplo:

```text
  +2
[CARTA]
```

El contador puede usar un pequeño badge.

Debe poder incrementarse/disminuirse fácilmente.

---

# 31. Turno

El jugador activo debe identificarse inmediatamente.

Evitar banners gigantes.

Ejemplos:

- glow sutil en mitad correspondiente;
- indicador superior;
- cambio de intensidad;
- texto breve.

Mostrar:

```text
TURNO N
Jugador activo
```

---

# 32. Fase

Fases iniciales:

```text
ALBA
AMANECER
MEDIODÍA
ANOCHECER
```

Debe existir un indicador compacto.

Ejemplo:

```text
ALBA | AMANECER | MEDIODÍA | ANOCHECER
                     ▲
```

El cambio es manual.

La UI no debe sugerir que efectos fueron ejecutados automáticamente.

---

# 33. Finalizar turno

`END_TURN` debe ser claramente accesible.

No colocarlo donde sea fácil activarlo accidentalmente.

Debe tener feedback inmediato.

No es necesario un modal de confirmación cada turno.

---

# 34. Menú contextual

Click derecho sobre una carta propia puede abrir acciones relevantes.

Ejemplo conceptual:

```text
Ampliar
Girar
Enderezar
Voltear
Enviar al Cementerio
Devolver a la Mano
```

Mostrar únicamente acciones estructuralmente disponibles.

Evitar menús enormes.

---

# 35. Doble click

Doble click puede utilizarse como shortcut para:

```text
TAP / UNTAP
```

cuando la carta admita visualmente dicho estado.

Debe coexistir con menú contextual.

---

# 36. Mazo Principal

Vista normal:

```text
[REVERSO]
   24
```

Debe mostrar:

- pila;
- reverso;
- cantidad.

Acciones principales accesibles:

- robar;
- barajar;
- inspeccionar cuando corresponda.

---

# 37. Inspección privada del Mazo

Cuando el propietario abre el Mazo Principal:

- usar overlay privado;
- mostrar cartas con buena legibilidad;
- permitir búsqueda visual;
- permitir acciones manuales necesarias;
- no revelar información al rival.

El rival debe seguir viendo únicamente el mazo cerrado.

---

# 38. Mazo de Esencias

Durante partida debe verse como pila cerrada.

Mostrar:

- reverso;
- cantidad.

No mostrar:

- búsqueda;
- barajar;
- abrir.

La interacción principal es obtener la carta superior.

---

# 39. Preparación del Mazo de Esencias

Antes de iniciar partida debe existir una interfaz específica para ordenar Esencias.

Debe permitir:

- drag horizontal/vertical;
- cambio claro de posiciones;
- indicador de primera;
- indicador de última;
- confirmar orden.

Ejemplo:

```text
PRIMERA →
[E1][E2][E3][E4][E5][E6][E7][E8][E9][E10]
                                              ← ÚLTIMA
```

Una vez confirmado debe quedar bloqueado.

---

# 40. Preparación multiplayer

Cada jugador realiza configuración privada.

La pantalla debe indicar claramente:

```text
TÚ: READY / NOT READY
RIVAL: READY / NOT READY
```

No revelar información privada de preparación.

Cuando ambos estén listos:

- transición hacia tablero;
- evitar cambio brusco;
- cargar estado inicial de forma clara.

---

# 41. Crear sala

La pantalla debe ser simple.

Elementos principales:

```text
Nombre
Deck
Crear sala
```

Después:

```text
Código
Link
Copiar
Esperando rival
```

Evitar onboarding innecesario.

---

# 42. Entrar a sala

Debe requerir únicamente lo esencial:

```text
Nombre
Deck
Entrar
```

El usuario que entra mediante link no debería tener que volver a escribir código de sala.

---

# 43. Estado de conexión

Debe existir feedback discreto de conexión:

```text
Conectado
Reconectando
Desconectado
```

No saturar interfaz mientras todo funciona normalmente.

---

# 44. Desconexión rival

Si el rival se desconecta:

mostrar mensaje claro pero no intrusivo.

Ejemplo:

```text
Reiner se desconectó.
Esperando reconexión…
```

El tablero debe permanecer intacto.

---

# 45. Reconexión

Al recargar:

- mostrar transición breve;
- recuperar estado;
- reconstruir perspectiva;
- evitar reset visual de partida.

No requerir que el usuario seleccione nuevamente su asiento si la sesión puede recuperarse.

---

# 46. Undo

Debe existir un control visible pero secundario:

```text
↶ Deshacer
```

Debe:

- habilitarse solo cuando sea posible;
- deshabilitarse claramente cuando no;
- no sugerir que cualquier acción histórica puede revertirse.

No requiere animación compleja.

---

# 47. Cementerio

Vista compacta:

```text
[Carta superior]
8
```

Click abre inspección.

Ambos jugadores pueden inspeccionar Cementerios públicos.

Solo el jugador autorizado puede manipular sus cartas.

---

# 48. Orden visual del Cementerio

Dentro de inspección:

- mostrar orden determinista;
- permitir ampliar;
- evitar diseños tipo tabla.

Preferir galería de cartas.

---

# 49. Información privada

Nunca indicar mediante UI información que el usuario no debería conocer.

Ejemplo incorrecto:

```text
Mano rival: 3
Kubrich
Verso X
Reliquia Y
```

aunque los nombres estén visualmente escondidos.

La UX debe diseñarse asumiendo que el cliente solo recibe la información permitida.

---

# 50. Visual ≠ editable

Una carta rival pública puede:

- ampliarse;
- leerse;
- inspeccionarse.

Pero no necesariamente:

- moverse;
- girarse;
- modificarse.

El cursor y feedback deben comunicar esta diferencia.

Ejemplo:

- hover de lectura permitido;
- drag desactivado.

---

# 51. Estados interactivos

Elementos interactivos deben diferenciar claramente:

```text
normal
hover
selected
dragging
valid drop
invalid drop
disabled
```

No depender solo de color.

Combinar:

- escala;
- borde;
- glow;
- opacidad;
- cursor.

---

# 52. Sonido

Sonido NO es requisito funcional de V0.1.

La arquitectura UX puede quedar preparada para:

- robo;
- drop;
- tap;
- Verso;
- daño;
- UI.

No agregar audio antes de estabilizar interacción básica.

---

# 53. Partículas

Las partículas son opcionales y secundarias.

Utilizar de forma discreta para:

- entrada de Verso;
- cambio importante de Santuario;
- drop válido;
- acciones especiales futuras.

Evitar efectos constantes.

---

# 54. Performance

Objetivo:

- interacción fluida en navegador desktop moderno;
- evitar re-render global innecesario;
- animaciones GPU-friendly cuando sea posible;
- evitar blur/filters excesivamente costosos;
- no cargar todas las imágenes en máxima resolución simultáneamente si no es necesario.

La sensación de respuesta tiene prioridad.

---

# 55. Imágenes de cartas

Las cartas son el elemento protagonista.

Debe respetarse:

- aspect ratio original;
- resolución suficiente;
- nitidez;
- carga progresiva cuando sea necesario.

No estirar imágenes.

Usar versiones optimizadas para tablero cuando sea posible y original/alta resolución para inspección.

---

# 56. Estado de carga

Mientras cargan assets:

- usar placeholders coherentes;
- evitar saltos de layout;
- mantener tamaño de carta.

No mostrar iconos rotos del navegador.

---

# 57. Reverso de carta

Debe existir un asset común para cartas ocultas.

Su uso incluye:

- Mano rival;
- Mazo Principal;
- Mazo de Esencias;
- cartas boca abajo.

El reverso debe mantener proporción y peso visual similar al frontal.

---

# 58. Accesibilidad básica

Aunque la experiencia es visual:

- mantener labels accesibles para controles;
- soportar navegación razonable de botones;
- usar contraste suficiente;
- no depender exclusivamente de color;
- permitir Escape para cerrar overlays.

No sacrificar UX principal del TCG para perseguir una interfaz administrativa tradicional.

---

# 59. Estados vacíos

Evitar cajas gigantes con mensajes.

Ejemplos:

Campo vacío:

```text
zona limpia
+
feedback sutil al arrastrar
```

No:

```text
NO HAY PERSONAJES
AGREGA UN PERSONAJE AQUÍ
```

La interfaz debe sentirse como mesa, no formulario.

---

# 60. Errores

Los errores deben mostrarse de forma discreta y accionable.

Ejemplos:

```text
No se pudo sincronizar la jugada.
Reintentando…
```

Evitar modales por errores recuperables.

---

# 61. Rollback visual

Si una acción optimista es rechazada por servidor:

- devolver carta a posición anterior;
- utilizar animación corta;
- informar motivo cuando exista.

No dejar estados visuales incoherentes.

---

# 62. Movimiento simultáneo

La UI debe tolerar actualizaciones provenientes del rival.

Cuando una carta rival cambia:

- animar la transición si es posible;
- evitar que aparezca teletransportada;
- no bloquear interacción propia innecesariamente.

---

# 63. Fuente de verdad visual

La UI siempre representa `PlayerView`.

Nunca mantener una representación paralela independiente que pueda divergir del estado autoritativo.

Estados de animación transitorios sí pueden existir, pero no deben reemplazar GameState.

---

# 64. Arquitectura de animación

Principio:

```text
GameAction
    ↓
GameState / PlayerView actualizado
    ↓
UI detecta transición
    ↓
Animation
```

No:

```text
Animation
    ↓
decide regla
    ↓
modifica partida
```

La animación es consecuencia, no causa.

---

# 65. Prioridad de animaciones V0.1

Implementar primero:

1. hover / lift;
2. drag & drop;
3. snap;
4. tap / untap;
5. robo;
6. Essence Deck → Essence Zone;
7. Mano → Campo;
8. Campo → Cementerio;
9. Verso → Resolución;
10. feedback de Santuario.

Después:

- partículas;
- efectos decorativos;
- transiciones cinematográficas.

---

# 66. Velocidad de animaciones

Las animaciones deben sentirse rápidas.

Evitar tiempos que ralenticen acciones repetitivas.

Principio:

> El jugador nunca debe sentir que está esperando a que termine una animación para seguir jugando, salvo cuando sea necesario para comunicar una acción importante.

---

# 67. Cancelación/interrupción

Cuando sea técnicamente viable:

- hover debe poder interrumpirse;
- drag debe responder inmediatamente;
- animaciones no críticas deben tolerar nuevas acciones.

No crear secuencias rígidas de animación para acciones manuales.

---

# 68. Modales

Utilizar modales solo para:

- inspección detallada;
- confirmaciones importantes;
- preparación específica;
- abandono.

Evitar modal para acciones frecuentes.

---

# 69. Confirmaciones

Confirmación obligatoria recomendada para:

- abandonar partida;
- eliminar deck;
- acciones destructivas persistentes.

No confirmar:

- tap;
- draw;
- drag;
- cambios frecuentes.

---

# 70. Deck Builder — Layout

Desktop recomendado:

```text
┌───────────────────────────────────────────────┐
│ CATÁLOGO               │ DECK                │
│                        │                     │
│ Buscar                 │ Main 35/35          │
│ Filtros                │ Arsenal 7/7         │
│                        │ Esencias            │
│ [Cards Grid]           │ Santuario           │
└───────────────────────────────────────────────┘
```

Debe priorizar visualización de cartas.

No convertir la colección en una tabla.

---

# 71. Deck Builder — interacción

Acciones:

- click para inspeccionar;
- botón +/- o interacción equivalente para cantidad;
- drag opcional si mejora UX;
- contador por carta;
- feedback inmediato.

El usuario debe comprender fácilmente cuántas copias utiliza.

---

# 72. Deck Builder — filtros

Inicialmente:

- nombre;
- tipo;
- facción.

Si metadata existe:

- coste;
- rareza;
- colección.

No saturar con filtros avanzados en V0.1.

---

# 73. Deck Builder — estados

Mostrar claramente:

```text
MAIN 34/35
ARSENAL 6/7
ESSENCE 10/10
SANCTUARY 1/1
```

Las cantidades deben actualizarse inmediatamente.

---

# 74. Carta TESTING

Si el usuario tiene acceso a cartas `TESTING`, diferenciarlas discretamente.

Ejemplo:

```text
TEST
```

badge pequeño.

No alterar el arte de forma agresiva.

---

# 75. Home

Home debe ser mínima.

Acciones principales:

```text
JUGAR
CREAR SALA
ENTRAR A SALA
DECK BUILDER
```

No llenar la portada con features futuras.

---

# 76. Identidad visual de Crónicas

Cuando existan assets oficiales de marca:

- respetar logos;
- respetar arte;
- construir la interfaz alrededor de ellos;
- evitar competir con las cartas.

El simulador debe sentirse parte del universo de Crónicas, sin copiar otro TCG.

---

# 77. Tematización por facción

Puede explorarse posteriormente:

- glow;
- partículas;
- acentos;
- efectos visuales por facción.

Esto no debe ser requisito inicial si complica implementación.

La UX base debe funcionar sin tematización específica.

---

# 78. Información de carta durante hover

Evitar duplicar todo el texto fuera de la carta si la imagen ya es legible.

En resoluciones donde no lo sea:

- preview ampliada;
- panel contextual opcional.

El arte debe seguir siendo protagonista.

---

# 79. Mano rival

Mostrar:

```text
[back][back][back][back]
```

Puede utilizar un abanico más pequeño.

Mostrar cantidad de forma clara.

No mostrar placeholders que permitan inferir tipo o identidad.

---

# 80. Campo rival

Las cartas rivales deben mantener suficiente tamaño para:

- reconocer arte;
- identificar tap;
- identificar Reliquias;
- ampliar mediante click.

No reducirlas tanto que solo sean iconos.

---

# 81. Zoom rival

Click en una carta rival pública debe permitir inspección completa.

Esto no concede autoridad de edición.

---

# 82. Cursor

Utilizar cursor coherente:

- pointer para selección;
- grab para draggable;
- grabbing durante drag;
- default/disabled cuando no editable.

El cursor debe ayudar a comunicar permisos.

---

# 83. Zona inválida

Si una carta pasa sobre una zona no aceptada estructuralmente:

- no iluminar;
- opcionalmente mostrar feedback mínimo;
- al soltar, retornar suavemente a origen.

No mostrar errores agresivos.

---

# 84. Zona válida

Al entrar a drop target válido:

- destacar;
- elevar;
- mostrar glow;
- opcionalmente expandir ligeramente espacio.

Debe sentirse evidente sin texto explicativo.

---

# 85. Reordenamiento de Campo

Los Personajes pueden reordenarse mediante drag.

Durante reordenamiento:

- mostrar hueco/preview;
- animar desplazamiento de vecinos;
- mantener Reliquias asociadas con su Personaje.

El grupo Personaje + Reliquias debe moverse visualmente como unidad.

---

# 86. Attach de Reliquia

Al arrastrar una Reliquia sobre un Personaje:

- destacar ese Personaje;
- resaltar área de Reliquias;
- indicar aceptación visual.

Al soltar:

- animar acople;
- mantener asociación visual clara.

---

# 87. Detach de Reliquia

Si la UX permite detach manual:

- mover hacia zona de Reliquias sin portador;
- animar separación;
- preservar claridad.

---

# 88. Preparación visual

La fase previa a partida debe sentirse parte del juego.

No diseñarla como formulario corporativo.

Usar:

- cartas reales;
- selección visual;
- transiciones;
- estado READY.

---

# 89. Mulligan

Mostrar la Mano inicial de forma protagonista.

Permitir seleccionar cartas a cambiar.

Estados:

```text
normal
selected-for-mulligan
```

La selección debe ser inequívoca.

Acciones:

```text
MULLIGAN
MANTENER MANO
```

---

# 90. Cambio hacia partida

Al finalizar preparación:

- transición breve;
- cerrar overlays;
- posicionar cartas;
- establecer perspectiva;
- entrar al tablero.

Evitar reload completo si no es necesario.

---

# 91. Final de partida

Como V0.1 puede finalizar manualmente:

mostrar overlay claro pero simple.

Ejemplo:

```text
PARTIDA FINALIZADA

[ Volver al inicio ]
```

Si existe ganador manual registrado, puede mostrarse.

No requiere cinemática compleja.

---

# 92. Abandono

Debe diferenciarse de finalización normal.

El rival recibe mensaje.

No eliminar inmediatamente posibilidad de revisar estado si producto decide conservarlo temporalmente.

---

# 93. Responsividad desktop

Cuando disminuye ancho:

1. reducir gaps;
2. compactar zonas;
3. reducir ligeramente escala;
4. permitir solapamientos controlados;
5. preservar Mano y cartas.

Evitar convertir el tablero en scroll vertical largo.

---

# 94. Scroll

Evitar scroll global durante partida.

La mesa debería caber dentro del viewport.

Scroll puede utilizarse dentro de:

- catálogo;
- deck inspector;
- cementerio;
- deck inspection;
- overlays.

---

# 95. Selección

Una carta seleccionada debe distinguirse sutilmente.

No mantener decenas de elementos visualmente seleccionados salvo una mecánica específica.

---

# 96. Tooltips

Usar tooltips para controles secundarios o iconos.

No utilizar tooltips como sustituto de diseño comprensible.

---

# 97. Texto

La interfaz debe usar poco texto durante partida.

Priorizar:

- símbolos;
- posición;
- carta;
- número;
- animación.

Textos largos pertenecen principalmente a:

- cartas;
- inspección;
- preparación;
- deck builder.

---

# 98. Internacionalización

V0.1 puede estar en español.

Evitar hardcodear texto crítico dentro de componentes cuando una solución simple permita centralizar strings.

No es necesario implementar i18n completo inicialmente.

---

# 99. Estabilidad visual

Evitar layout shifts cuando:

- aparece una carta;
- cambia mano;
- cambia cantidad;
- carga imagen;
- aparece Reliquia.

Las transiciones deben preservar sensación espacial.

---

# 100. Criterio de éxito UX

La UX se considera exitosa si un jugador que ya conoce Crónicas puede:

- identificar inmediatamente su Mano;
- distinguir su Campo del rival;
- jugar una carta sin explicación;
- reconocer dónde están sus Esencias;
- asociar una Reliquia intuitivamente;
- inspeccionar cualquier carta relevante;
- entender qué está girado;
- reconocer la Zona de Resolución;
- modificar su Santuario;
- seguir el turno;
- jugar una partida completa sin sentir que está usando una herramienta administrativa.

---

# 101. Regla final

Ante conflicto entre:

```text
animación espectacular
```

y:

```text
claridad + velocidad + precisión
```

siempre elegir:

```text
claridad + velocidad + precisión
```

El objetivo no es demostrar tecnología visual.

El objetivo es que **jugar Crónicas digitalmente se sienta natural, fluido y entretenido**.
