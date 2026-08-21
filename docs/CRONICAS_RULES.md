# Crónicas FCG — Rules Reference

**Estado:** referencia operativa inicial  
**Fecha de revisión:** 2026-08-20  
**Ámbito:** reglas estables relevantes para el simulador  
**Fuente principal:** https://www.cronicasfcg.cl/Home/ReglasDelJuego

## 1. Propósito

Este documento contiene únicamente reglas suficientemente estables y útiles para construir el **Crónicas FCG Digital Playtesting Simulator**.

No intenta reemplazar el reglamento oficial ni documentar todos los rulings del juego.

Su función es entregar a Codex una referencia local y controlada para decisiones que afectan al producto.

Principio:

> **El simulador conoce la estructura de Crónicas, pero no arbitra Crónicas.**

Si una regla no aparece aquí, no debe inferirse automáticamente.

Las aclaraciones posteriores de los desarrolladores se registran primero en `RULES_CLARIFICATIONS.md`.

---

# 2. Jerarquía de fuentes

Para el proyecto, usar este orden:

1. aclaración confirmada y vigente en `RULES_CLARIFICATIONS.md`;
2. este documento;
3. documentación oficial enlazada en la sección Fuentes;
4. interacción manual por parte de los jugadores.

Nunca completar una regla basándose en otros TCG.

---

# 3. Objetivo básico

- Cada jugador controla un Santuario.
- El objetivo es reducir la Vida del Santuario rival a 0.
- La Vida inicial del Santuario proviene del valor impreso en la carta.
- El simulador V0.1 no necesita determinar automáticamente el ganador.

---

# 4. Componentes del juego

Para los formatos principales de 35 cartas utilizados como baseline del MVP:

```text
Mazo Principal: 35 cartas
Mazo de Esencias: 10 cartas
Santuario: 1
Arsenal: hasta 7 cartas
```

El Mazo Principal no contiene Santuarios ni Esencias.

El Mazo de Esencias contiene exclusivamente Esencias.

El Arsenal se utiliza entre juegos de una serie y no forma parte de la mesa activa durante un juego normal.

## Nota sobre formatos

El reglamento oficial contempla actualmente:

- Guerra de Facción;
- Alianza;
- Convergencia.

Alianza es indicado por el reglamento como el formato principal competitivo.

V0.1 no debe asumir que todas las restricciones de construcción de estos formatos están automatizadas.

---

# 5. Tipos de carta

Tipos estructurales reconocidos:

```text
Personaje
Reliquia
Verso
Esencia
Santuario
```

## Personaje

- permanece en juego una vez jugado correctamente;
- posee Ataque y Vida;
- puede poseer subclase;
- ocupa Campo.

## Reliquia

- permanece en juego una vez jugada correctamente;
- puede equiparse a un Personaje válido;
- puede existir en Campo sin portador;
- cuando su portador sale del Campo, la Reliquia no se destruye automáticamente por ese motivo;
- no existe un límite general de Reliquias equipadas a un Personaje según el reglamento actual.

## Verso

- es una carta de efecto inmediato;
- puede contener Prólogo y/o Epílogo;
- al jugarse se escoge una de las opciones disponibles;
- intenta resolverse;
- luego se envía al Cementerio.

V0.1 representa este flujo de forma manual.

## Esencia

- pertenece al Mazo de Esencias;
- no pertenece al Mazo Principal;
- no se juega como una carta normal;
- se utiliza como recurso para pagar costes;
- puede estar enderezada o girada.

## Santuario

- comienza en juego;
- representa la Vida principal del jugador;
- posee su propia habilidad;
- no pertenece a una facción.

---

# 6. Preparación de un juego

Flujo base confirmado:

1. cada jugador coloca su Santuario;
2. se determina quién comienza;
3. cada jugador roba 5 cartas del Mazo Principal;
4. cada jugador puede realizar un mulligan una vez;
5. una vez resueltos los mulligans comienza el juego.

El reglamento determina el jugador inicial mediante un dado; quien obtiene el resultado mayor decide quién comienza.

Para el simulador puede utilizarse una representación digital equivalente siempre que se preserve la decisión de quién inicia.

---

# 7. Mulligan

Cada jugador puede realizar mulligan **una sola vez**.

Procedimiento:

1. revisar las 5 cartas iniciales;
2. seleccionar cualquier cantidad de ellas;
3. colocar las seleccionadas al fondo del Mazo Principal;
4. robar hasta volver a tener 5 cartas.

El simulador puede automatizar únicamente este movimiento mecánico.

No debe interpretar si una mano es conveniente.

---

# 8. Mazo de Esencias

El Mazo de Esencias funciona de manera distinta al Mazo Principal.

Para Alianza y Guerra de Facción contiene 10 cartas.

## Orden

Las posiciones permitidas para Esencias especiales dependen de quién comienza.

Jugador inicial:

```text
2, 4, 6, 8
```

Segundo jugador:

```text
1, 3, 5, 7
```

La configuración se realiza antes de comenzar el juego.

## Durante el juego

En Alba:

1. primero se enderezan las cartas correspondientes;
2. luego se agrega la siguiente Esencia desde el Mazo de Esencias.

La Esencia entra enderezada salvo que una carta indique lo contrario.

La Esencia que entra puede utilizarse ese mismo turno para pagar costes.

Para el MVP:

- el Mazo de Esencias no se baraja durante el juego;
- no se busca en él;
- no se inspecciona mediante la UI;
- solo se toma la carta superior;
- el orden confirmado antes del juego se conserva.

---

# 9. Turno

Cada turno posee cuatro fases:

```text
ALBA
AMANECER
MEDIODÍA
ANOCHECER
```

## Alba

Orden base:

1. enderezar;
2. agregar 1 Esencia.

## Amanecer

El jugador roba 1 carta del Mazo Principal.

## Mediodía

Es la fase principal de desarrollo.

Pueden jugarse cartas y activarse acciones permitidas por las reglas.

El MVP no necesita validar cuáles son legales.

## Anochecer

Marca el final del turno y el control pasa al rival.

---

# 10. Restricción del primer turno

El jugador que comienza:

- no roba carta en su primer Amanecer;
- no puede declarar Embate durante su primer turno.

La prohibición de Embate del primer turno no puede ser ignorada por efectos de cartas según el reglamento actual.

**Implementación V0.1:** esta regla puede mantenerse como responsabilidad del jugador mientras el producto no tenga arbitraje automático.

---

# 11. Información pública y privada

Son información pública durante el juego:

- Cementerio;
- Santuario;
- Personajes en juego;
- Reliquias en juego;
- Esencias en juego.

El Cementerio puede revisarse por cualquier jugador.

La información que no está definida expresamente como pública debe tratarse como privada salvo regla o efecto que indique lo contrario.

La implementación multiplayer debe proteger información privada a nivel de servidor.

---

# 12. Estado girado y enderezado

Las cartas giradas y enderezadas deben poder distinguirse inequívocamente.

Las Esencias utilizadas para pagar costes deben poder distinguirse de las no utilizadas.

En el simulador:

```text
ENDEREZADA = 0°
GIRADA = aproximadamente 90°
```

La orientación visual no define por sí sola por qué la carta fue girada.

---

# 13. Campo

El reglamento actual establece:

- no existe un límite general de Personajes en juego;
- no existe un límite general de Reliquias en mesa sin portador.

Por esto el simulador usa Campo dinámico y no una cantidad fija hardcodeada de slots.

---

# 14. Reliquias y portadores

Una Reliquia puede:

```text
Mano → Campo equipada a Personaje
```

o:

```text
Mano → Campo sin portador
```

Si una Reliquia está en Campo sin portador, puede posteriormente ser equipada cuando las reglas lo permitan.

Cuando el portador sale del Campo:

```text
Personaje → otra zona
Reliquia → permanece en Campo sin portador
```

salvo que una carta indique otra cosa.

Para V0.1, las operaciones de equipar, desequipar o cambiar asociación pueden representarse manualmente.

---

# 15. Versos

Un Verso posee hasta dos opciones:

```text
PRÓLOGO
EPÍLOGO
```

Al jugarlo:

1. se paga el coste según las reglas;
2. se muestra;
3. se escoge la opción utilizada;
4. si necesita objetivo, éste se declara según corresponda;
5. intenta resolverse;
6. se envía al Cementerio.

Para V0.1:

```text
HAND
 ↓
VERSE_RESOLUTION
 ↓
GRAVEYARD
```

La aplicación no ejecuta automáticamente el texto de Prólogo o Epílogo.

La arquitectura debe permitir registrar posteriormente qué opción fue elegida.

---

# 16. Costes y Esencias

Las Esencias pueden girarse para pagar el coste de cartas.

El número de coste impreso en una carta representa la cantidad de Esencia requerida.

V0.1 permite:

- girar Esencias;
- enderezarlas;
- jugar cartas manualmente.

V0.1 NO necesita:

- calcular automáticamente costes;
- impedir jugadas por recursos insuficientes;
- seleccionar automáticamente qué Esencias pagar.

---

# 17. Cementerio

Van al Cementerio, entre otros casos:

- cartas destruidas;
- Versos ya utilizados/resueltos.

El Cementerio:

- es público;
- es inspeccionable;
- debe mantener las cartas identificables.

Los efectos que recuperen o manipulen cartas del Cementerio pueden representarse manualmente mientras no exista automatización específica.

---

# 18. Dueño y controlador

El reglamento distingue conceptualmente entre dueño y controlador.

Una carta puede cambiar de controlador sin cambiar de dueño.

Si una carta que pertenece originalmente al rival debe ir posteriormente a una zona personal como Mano o Cementerio, se aplican las reglas oficiales correspondientes a su dueño.

Por esto el simulador debe conservar separadamente:

```text
ownerId
controllerId
```

No asumir que siempre son iguales.

---

# 19. Reglas que NO deben automatizarse todavía

Aunque existan en el reglamento, V0.1 no debe implementar automáticamente sin una tarea explícita:

- Embate;
- Bloqueo;
- Duelo;
- asignación de daño;
- entrenamiento;
- Talento;
- Temple;
- Interferencia;
- Resplandor;
- prioridad;
- cadenas de resolución;
- ventanas de respuesta;
- objetivos;
- modificadores temporales;
- modificadores permanentes;
- condiciones basadas en estado;
- Mítica;
- Límite;
- Vincular;
- Devastar;
- demás keywords;
- interacciones específicas entre cartas.

Estas reglas pueden seguir siendo resueltas por los jugadores.

---

# 20. Comportamiento ante una regla desconocida

Cuando Codex encuentre una situación que este documento no cubre:

```text
NO inferir regla
NO bloquear por intuición
NO copiar comportamiento de otro TCG
```

Debe preferir:

```text
representación manual
+
modelo extensible
```

Si la situación requiere una decisión del juego, registrarla como pendiente de aclaración.

---

# 21. Fuentes oficiales

Fuentes utilizadas para construir esta referencia:

- https://www.cronicasfcg.cl/Home/ReglasDelJuego
- https://www.cronicasfcg.cl/Home/ComoJugar
- https://www.cronicasfcg.cl/Home/MecanicasBasicas
- https://www.cronicasfcg.cl/Home/MecanicasAvanzadas
- https://www.cronicasfcg.cl/Home/PreguntasFrecuentes

Ante cambios de las fuentes oficiales, este archivo debe actualizarse deliberadamente.

No asumir que una actualización web debe convertirse automáticamente en código.

---

# 22. Regla final para el simulador

> **Una regla oficial describe Crónicas. `MVP_SCOPE.md` determina qué parte de esa regla implementa actualmente el software.**

La existencia de una regla en este documento no autoriza por sí sola su automatización.
