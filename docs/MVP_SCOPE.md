# Crónicas FCG — MVP Scope

## Versión

```text
MVP V0.1
```

## Objetivo

La V0.1 debe permitir que dos personas que conocen Crónicas FCG puedan completar remotamente una partida usando dos navegadores diferentes.

La aplicación funciona como una mesa digital multiplayer.

Los jugadores aplican las reglas.

---

# 1. Definición de éxito

La V0.1 se considera funcional cuando:

1. dos jugadores pueden conectarse a una sala privada;
2. cada jugador puede cargar un deck;
3. pueden completar la preparación;
4. pueden jugar una partida de principio a fin;
5. ambos clientes permanecen sincronizados;
6. la información privada permanece protegida;
7. una recarga del navegador no destruye la sesión;
8. todas las acciones estructurales esenciales pueden representarse;
9. no se necesita consola, edición de archivos ni herramientas de desarrollador para completar una partida;
10. la experiencia visual se siente como un TCG digital y no como un CRUD.

---

# 2. Incluido — Catálogo

V0.1 incluye:

* catálogo de cartas;
* imágenes reales cuando estén disponibles;
* metadata estructurada;
* cartas `RELEASED`;
* posibilidad estructural de cartas `TESTING`;
* búsqueda básica;
* filtros básicos por tipo y facción cuando los datos lo permitan.

Inicialmente los datos pueden provenir de:

```text
cards.json
```

y assets locales.

---

# 3. Incluido — Deck Builder

Debe permitir crear una configuración de deck con:

```text
Main Deck: 35
Arsenal: hasta 7
Essence Deck
Sanctuary: 1
```

Debe permitir:

* agregar;
* quitar;
* visualizar cantidad;
* guardar;
* cargar;
* eliminar decks locales.

Persistencia inicial:

```text
localStorage
```

No requiere cuenta.

No implementar validaciones complejas de construcción salvo reglas estructurales confirmadas.

---

# 4. Incluido — Multiplayer

Modo:

```text
1 vs 1
```

Debe permitir:

* crear sala;
* obtener código;
* obtener link;
* entrar mediante link/código;
* máximo 2 jugadores;
* nombres temporales;
* no requerir cuenta.

---

# 5. Estados de sala

Estados conceptuales:

```text
CREATED
WAITING_FOR_PLAYER
PREPARATION
IN_GAME
FINISHED
ABANDONED
```

---

# 6. Incluido — Reconexión

Un jugador debe poder:

* refrescar la página;
* perder conexión temporalmente;
* reconectarse a su asiento.

Una desconexión nunca modifica el estado de partida.

La identidad temporal debe sobrevivir un refresh razonable del navegador.

---

# 7. Incluido — Preparación

Debe soportar:

* selección de deck;
* selección/configuración de Santuario;
* definición de jugador inicial;
* ordenamiento privado del Mazo de Esencias;
* confirmación de orden;
* preparación de Mazo Principal;
* robo inicial de 5;
* mulligan;
* estado READY por jugador;
* entrada a partida cuando ambos estén preparados.

---

# 8. Incluido — Mesa

La mesa debe contener:

* Mazo Principal;
* Mazo de Esencias;
* Mano;
* Campo;
* Santuario;
* Zona de Esencias;
* Cementerio;
* Zona de Resolución de Versos.

Cada usuario se visualiza siempre en la mitad inferior de su propia pantalla.

---

# 9. Incluido — Personajes

Debe permitir:

* jugar desde Mano;
* generar slot dinámico;
* `1..N` Personajes;
* reordenar slots;
* girar;
* enderezar;
* ampliar;
* voltear;
* mover a zonas estructuralmente soportadas;
* contador genérico.

No implementar legalidad de juego.

---

# 10. Incluido — Reliquias

Debe permitir:

* jugar desde Mano;
* quedar sin portador;
* asociarse a un Personaje;
* `0..N` Reliquias por Personaje;
* cambiar asociación manualmente cuando la interfaz lo permita;
* ampliar;
* mover al Cementerio;
* devolver a otras zonas manuales cuando corresponda.

No automatizar modificadores de estadísticas.

---

# 11. Incluido — Versos

Debe permitir:

```text
HAND
 ↓
VERSE_RESOLUTION
 ↓
GRAVEYARD
```

La Zona de Resolución debe ser pública y visualmente protagonista.

Las definiciones de Verso almacenan:

```text
prologueText
epilogueText
```

La arquitectura debe permitir posteriormente registrar:

```text
PROLOGUE
EPILOGUE
```

como elección.

No ejecutar los efectos.

---

# 12. Incluido — Esencias

Durante preparación:

* ordenar mediante drag & drop;
* confirmar orden.

Durante partida:

* no abrir;
* no buscar;
* no barajar;
* tomar solamente la primera;
* moverla directamente a Zona de Esencias;
* girar;
* enderezar;
* ampliar.

No permitir drag & drop libre desde Zona de Esencias hacia otras zonas.

---

# 13. Incluido — Santuario

Debe mostrar:

* carta;
* vida actual.

Debe permitir al controlador:

```text
-
+
```

y edición directa razonable del valor.

El cambio de vida es manual.

Debe existir feedback visual al modificarla.

---

# 14. Incluido — Mazo Principal

Debe permitir:

* contar cartas;
* robar superior;
* barajar;
* abrir privadamente;
* inspeccionar;
* realizar búsquedas manuales;
* representar reordenamientos cuando sea necesario.

El rival ve únicamente información pública.

---

# 15. Incluido — Mano

Propietario:

* ve cartas;
* puede ampliarlas;
* puede jugarlas mediante drag & drop.

Rival:

* ve reversos;
* ve cantidad.

La mano se ordena automáticamente por tipo.

No puede reordenarse manualmente.

---

# 16. Incluido — Cementerio

Debe ser:

* público;
* inspeccionable;
* ampliable.

El jugador no puede manipular directamente cartas pertenecientes al rival.

---

# 17. Incluido — Carta

Interacciones básicas:

* hover;
* ampliar;
* drag;
* drop;
* girar;
* enderezar;
* voltear boca arriba;
* voltear boca abajo;
* contador genérico.

---

# 18. Incluido — Turnos y fases

Mostrar:

```text
turnNumber
activePlayer
phase
```

Fases:

```text
ALBA
AMANECER
MEDIODIA
ANOCHECER
```

Cambio de fase manual.

Botón de terminar turno.

No disparar efectos automáticamente.

---

# 19. Incluido — Undo

V0.1 incluye Undo limitado.

Solo puede revertirse la última acción global si ninguna acción posterior ha ocurrido.

No implementar negociación de Undo entre jugadores todavía.

---

# 20. Incluido — Finalización

Debe permitir:

* finalizar partida manualmente;
* abandonar partida;
* informar abandono al rival;
* volver al inicio.

No requiere determinar automáticamente ganador.

---

# 21. Incluido — Dirección visual

La V0.1 debe usar una presentación TCG digital 2.5D.

Debe incluir progresivamente:

* mano en abanico;
* hover;
* card lift;
* tilt;
* sombras;
* profundidad;
* drag fluido;
* spring animations;
* drop zones reactivas;
* animación de robo;
* animación de Esencia;
* tap/untap animado;
* transición hacia Cementerio;
* Zona de Resolución de Versos protagonista;
* feedback de daño/cambio de Santuario.

Las animaciones no deben alterar GameState.

---

# 22. Prioridad de UX

Orden de prioridad:

1. interacción correcta;
2. sincronización;
3. privacidad;
4. claridad de estado;
5. fluidez;
6. animaciones;
7. efectos decorativos.

Nunca sacrificar estabilidad multiplayer por efectos visuales.

---

# 23. Fuera de alcance V0.1

NO implementar:

* rules engine;
* interpretación automática del texto de cartas;
* efectos automáticos;
* costes automáticos;
* validación de recursos;
* targeting automático;
* combate automático;
* bloqueo automático;
* Embate automático;
* Talento automático;
* Temple automático;
* triggers automáticos;
* prioridad;
* pila completa;
* ventanas de respuesta automatizadas;
* cambios automáticos de ATQ/VIDA;
* matchmaking;
* ranked;
* ladder;
* ranking;
* torneos;
* cuentas;
* login obligatorio;
* perfiles persistentes;
* chat;
* espectadores;
* IA;
* tutorial;
* onboarding para jugadores nuevos;
* tienda;
* monetización;
* estadísticas avanzadas;
* replay completo;
* Bo3 completo;
* sideboarding entre Juegos;
* mobile como plataforma prioritaria.

---

# 24. Regla de alcance

La existencia de una funcionalidad en:

* reglas oficiales;
* documentación de dominio;
* roadmap;
* comentarios del código;

NO significa que deba implementarse en V0.1.

Solo debe implementarse si:

1. aparece expresamente en este documento; o
2. una tarea posterior modifica explícitamente el alcance.

---

# 25. Principio final

Ante una elección entre:

```text
automatizar una regla todavía inestable
```

y:

```text
permitir que los jugadores la representen manualmente
```

para V0.1 se debe preferir la segunda opción.
