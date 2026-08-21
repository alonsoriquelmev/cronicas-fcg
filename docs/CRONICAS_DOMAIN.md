# Crónicas FCG — Digital Domain Specification

## 1. Propósito

Este documento define el dominio digital mínimo necesario para representar una partida de Crónicas FCG.

No pretende documentar todas las reglas del juego.

Su objetivo es definir:

* objetos;
* tipos de carta;
* zonas;
* estado;
* relaciones;
* acciones;
* visibilidad;
* comportamiento estructural.

Principio:

> **El simulador conoce la estructura de Crónicas, pero no arbitra Crónicas.**

Las reglas y rulings deben mantenerse separados de este modelo siempre que sea posible.

---

# 2. Tipos de carta

El modelo reconoce inicialmente cinco tipos principales:

```text
CHARACTER
RELIC
VERSE
ESSENCE
SANCTUARY
```

Los tipos deben ser extensibles.

---

# 3. CardDefinition

`CardDefinition` representa la definición permanente de una carta.

Nunca contiene estado perteneciente a una partida concreta.

## Campos comunes

```text
id
name
type

factionId | null
subtype | null

image

setId | null
collectorNumber | null
rarity | null

status
```

Estados iniciales:

```text
RELEASED
TESTING
```

El nombre visible nunca debe utilizarse como ID.

---

# 4. Personaje

Un Personaje puede contener:

```text
cost
attack
health
rulesText
```

Puede tener `subtype`.

Ejemplo conceptual:

```text
type = CHARACTER
subtype = "Guerrero"
cost = 4
attack = 3
health = 5
```

---

# 5. Reliquia

Una Reliquia puede contener:

```text
cost
attackModifier | null
healthModifier | null
rulesText
```

Los modificadores no representan ATQ o VIDA propios.

Una Reliquia puede tener `subtype`.

Ejemplo:

```text
type = RELIC
subtype = "Implemento"

attackModifier = +2
healthModifier = -1
```

---

# 6. Verso

Un Verso puede contener dos textos diferentes:

```text
prologueText | null
epilogueText | null
```

También puede poseer:

```text
cost
```

Prólogo y Epílogo son opciones diferentes de la misma carta.

La opción seleccionada durante una partida NO pertenece a `CardDefinition`.

Debe pertenecer a la acción mediante la cual se juega el Verso.

---

# 7. Esencia

Las Esencias son cartas pertenecientes a un sistema y mazo independiente.

Pueden contener:

```text
rulesText | null
```

No asumir subtipos adicionales sin evidencia del juego.

---

# 8. Santuario

Un Santuario puede contener:

```text
health
rulesText
```

La vida inicial de una partida debe derivarse de la definición de la carta, no de una constante global.

---

# 9. CardInstance

`CardInstance` representa una copia específica de una carta dentro de una partida.

Campos conceptuales:

```text
instanceId
cardId

ownerId
controllerId

zone
zoneOrder

tapped
faceUp
counter

attachedToInstanceId | null
```

## ownerId

Representa el propietario de la carta.

## controllerId

Representa quién controla actualmente la carta.

No asumir que ambos valores siempre serán iguales.

## zoneOrder

Representa orden lógico dentro de una zona.

No almacenar coordenadas X/Y de presentación dentro de GameState.

## counter

El MVP utiliza inicialmente un único contador numérico genérico por carta.

Su significado corresponde a los jugadores.

---

# 10. Zonas

Zonas iniciales:

```text
MAIN_DECK
ESSENCE_DECK
HAND
FIELD
ESSENCE_ZONE
SANCTUARY
GRAVEYARD
VERSE_RESOLUTION
```

Las zonas no son equivalentes entre sí.

Cada una posee comportamiento estructural propio.

---

# 11. Mazo Principal

Características:

* ordenado internamente;
* normalmente oculto;
* permite robar la primera carta;
* puede barajarse;
* puede ser inspeccionado privadamente cuando el jugador necesite representar un efecto;
* puede soportar búsqueda/reordenamiento manual para representar efectos todavía no automatizados.

Cantidad de cartas restantes es información pública.

La identidad de las cartas es privada salvo revelación.

---

# 12. Mazo de Esencias

El Mazo de Esencias NO funciona como un segundo Mazo Principal.

Características:

* se ordena antes de comenzar;
* su orden se bloquea al iniciar la partida;
* durante la partida no se baraja;
* durante la partida no se busca;
* durante la partida no se inspecciona;
* únicamente puede extraerse la primera carta;
* la carta extraída pasa directamente a `ESSENCE_ZONE`.

La preparación debe preservar exactamente su orden.

---

# 13. Mano

La mano propia es visible al propietario.

La mano rival es privada.

Las cartas no pueden ser reordenadas manualmente.

La UI debe ordenarlas automáticamente por tipo.

Orden inicial definido:

```text
CHARACTER
VERSE
RELIC
otros tipos que posteriormente correspondan
```

Dentro de cada grupo debe mantenerse un orden determinista y estable.

Las cartas de la mano no se utilizan para alimentar la Zona de Esencias.

---

# 14. Campo

El Campo no utiliza un máximo visual hardcodeado de Personajes.

Es visualmente abierto y genera slots dinámicos de `1..N`.

Conceptualmente:

```text
Field
└── CharacterSlot[]
```

Cada slot existe porque existe un Personaje.

Al desaparecer un Personaje, desaparece su slot visual.

Los slots restantes se compactan.

Los Personajes pueden reordenarse.

El orden se representa mediante `zoneOrder`, no coordenadas.

---

# 15. Reliquias en el Campo

Cada Personaje puede poseer:

```text
0..N Reliquias
```

Una Reliquia equipada se representa mediante:

```text
attachedToInstanceId = characterInstanceId
```

Una Reliquia también puede existir en el Campo sin portador:

```text
attachedToInstanceId = null
```

Las Reliquias siguen siendo `CardInstance` independientes.

No deben almacenarse como objetos embebidos dentro del Personaje.

---

# 16. Zona de Resolución de Versos

Los Versos no generan slots permanentes.

Flujo estructural:

```text
HAND
  ↓
VERSE_RESOLUTION
  ↓
GRAVEYARD
```

La zona es pública para ambos jugadores.

En el MVP el efecto no se ejecuta automáticamente.

En versiones posteriores `PLAY_VERSE` podrá incluir:

```text
selectedMode = PROLOGUE | EPILOGUE
```

---

# 17. Zona de Esencias

Flujo estructural:

```text
ESSENCE_DECK
      ↓
ESSENCE_ZONE
```

Dentro de la Zona de Esencias una carta puede:

* visualizarse;
* ampliarse;
* girarse;
* enderezarse.

No debe existir drag & drop libre desde Esencias hacia otras zonas en el MVP.

---

# 18. Santuario

Cada jugador controla un Santuario.

Características:

* zona exclusiva;
* carta pública;
* vida pública;
* contador modificable manualmente por su controlador;
* la vida inicial proviene de la carta.

El sistema no calcula automáticamente daño de combate en el MVP.

---

# 19. Cementerio

El Cementerio es público.

Ambos jugadores pueden:

* abrirlo;
* inspeccionar cartas;
* ampliar cartas.

Solamente el jugador autorizado puede manipular las cartas correspondientes.

---

# 20. Estado girado

Las cartas pueden representar:

```text
tapped = false
tapped = true
```

Visualmente `tapped = true` se representa mediante una rotación aproximada de 90°.

El sistema no asume por qué una carta fue girada.

---

# 21. Estado boca arriba / boca abajo

Las cartas pueden representar:

```text
faceUp = true
faceUp = false
```

Una carta propia boca abajo sigue siendo identificable para su propietario.

Para un oponente sin permiso de visibilidad debe mostrarse únicamente el reverso.

---

# 22. Visibilidad

Distinguir siempre:

```text
Ownership
Control
Visibility
Edit authority
```

Son conceptos independientes.

---

# 23. Información base por zona

| Zona                    | Propietario                  | Rival               |
| ----------------------- | ---------------------------- | ------------------- |
| Mano                    | identidad visible            | reversos + cantidad |
| Mazo Principal          | identidad normalmente oculta | oculta              |
| Inspección de Mazo      | privada                      | no visible          |
| Mazo de Esencias        | oculto durante partida       | oculto              |
| Preparación de Esencias | privada                      | privada             |
| Zona de Esencias        | pública                      | pública             |
| Campo                   | público                      | público             |
| Reliquias               | públicas                     | públicas            |
| Santuario               | público                      | público             |
| Cementerio              | público                      | público             |
| Resolución de Versos    | pública                      | pública             |

---

# 24. Multiplayer y privacidad

El servidor mantiene un `GameState` completo.

Cada cliente recibe una perspectiva apropiada:

```text
GameState
   ↓
PlayerView
```

Una carta secreta no debe protegerse únicamente mediante CSS.

Cuando sea posible, el cliente rival no debe recibir su identidad real.

---

# 25. GameAction

Todo cambio significativo de una partida debería poder representarse como una acción serializable.

Catálogo inicial conceptual:

## Mazo Principal

```text
DRAW_CARD
SHUFFLE_MAIN_DECK
MOVE_CARD_FROM_DECK
REORDER_MAIN_DECK
```

## Esencias

```text
REORDER_ESSENCE_DECK
DRAW_ESSENCE
```

`REORDER_ESSENCE_DECK` pertenece a preparación.

## Juego

```text
PLAY_CHARACTER
PLAY_RELIC
PLAY_VERSE
RESOLVE_VERSE
```

## Campo

```text
MOVE_CARD
REORDER_FIELD
ATTACH_RELIC
DETACH_RELIC
```

## Estado de carta

```text
TAP_CARD
UNTAP_CARD
FLIP_FACE_UP
FLIP_FACE_DOWN
CHANGE_CARD_COUNTER
```

## Santuario

```text
CHANGE_SANCTUARY_HP
SET_SANCTUARY_HP
```

## Partida

```text
SET_PHASE
END_TURN
```

## Visibilidad

```text
REVEAL_CARD
HIDE_CARD
```

---

# 26. MOVE_CARD

`MOVE_CARD` funciona como válvula de escape para representar manualmente interacciones no automatizadas.

No debe reemplazar acciones semánticas cuando exista una acción más clara.

Ejemplo:

Robar debe representarse como:

```text
DRAW_CARD
```

y no simplemente:

```text
MOVE_CARD MAIN_DECK → HAND
```

aunque internamente ambas terminen modificando zonas.

---

# 27. Undo

Undo pertenece al simulador, no a las reglas de Crónicas.

En multiplayer:

* solo puede revertirse la acción global más reciente;
* un jugador no puede deshacer unilateralmente una acción anterior si ya existen acciones posteriores.

Una versión futura podrá implementar solicitud de Undo al rival.

---

# 28. Preparación de partida

Una configuración de juego contempla:

```text
Main Deck
35 cartas

Arsenal
hasta 7 cartas

Essence Deck
ordenado

Sanctuary
1 carta
```

Flujo conceptual:

```text
seleccionar deck
      ↓
determinar jugador inicial
      ↓
ordenar Essence Deck
      ↓
preparar Main Deck
      ↓
mano inicial
      ↓
mulligan
      ↓
READY
```

La preparación del Mazo de Esencias debe ser privada.

---

# 29. Mano inicial

La mano inicial contiene 5 cartas según las reglas actualmente adoptadas por el producto.

El sistema puede realizar mecánicamente el robo.

La aplicación puede asistir el mulligan sin interpretar efectos de cartas.

---

# 30. Fases

El simulador puede representar fases como estado visual.

Inicialmente:

```text
ALBA
AMANECER
MEDIODIA
ANOCHECER
```

El cambio de fase es manual.

Cambiar de fase no ejecuta automáticamente efectos.

---

# 31. Turnos

El estado debe conocer:

```text
turnNumber
activePlayerId
phase
```

`END_TURN` cambia el jugador activo.

No debe automatizar reglas adicionales salvo que `MVP_SCOPE.md` lo establezca expresamente.

---

# 32. Principio de tolerancia a rulings nuevos

Cuando aparezca una interacción que el simulador todavía no conoce:

1. priorizar representación manual;
2. reutilizar acciones genéricas existentes cuando sea suficiente;
3. evitar ampliar el rules engine;
4. documentar nuevas necesidades estructurales;
5. automatizar solamente cuando exista decisión explícita de producto.
