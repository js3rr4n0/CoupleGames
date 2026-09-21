# CoupleGames

Una mesa de juegos para **parejas y grupos pequeños**: creas una sala, pasas el
código y cada quien juega desde su móvil. Lo que es secreto lo decide el
servidor, así que **nadie puede ver las cartas ajenas** por mucho que hurgue en
la pestaña.

**Seis juegos completos**: ¿Quién soy?, Conecta 4, Batalla naval, UNO, Cluedo y
Monopolio. Todos traen sus reglas dentro, historial de la partida y una libreta
privada para ir apuntando lo que descartas.

## ¿Quién soy?

El juego de la casa: cada ronda reparte un personaje real traído **en vivo desde
APIs públicas gratuitas** (cine, series, anime, música, DreamWorks, Pixar,
Disney, superhéroes, Harry Potter, libros, Pokémon…). No hay lista fija ni
buscador, y quien adivina nunca puede ver su propia carta.

![Pantalla de inicio](docs/screenshots/01-inicio.png)

### Cómo se juega

1. **Creas la sala** con tu nombre y cuántos van a jugar. No hay registro, ni
   claves, ni API keys.
2. **Compartes el enlace** (o el código de 5 letras). El resto entra desde
   cualquier móvil y aparece en el lobby al instante.
3. **Por turnos, alguien adivina**: su personaje se muestra en las pantallas del
   resto y en la suya solo aparecen los huecos del nombre.
4. Quien adivina **pregunta en voz alta** y el grupo responde con los botones
   **Sí / No / Quizá**. Puede gastar hasta **3 pistas** (−20 puntos cada una)
   antes de arriesgar un nombre.
5. Acertar rápido da más puntos; el resto del grupo también suma por ayudar.
   Al terminar hay **podio, historial** y **revancha** con personajes nuevos.

| Quien adivina (móvil) | El resto del grupo |
| --- | --- |
| ![Vista de quien adivina](docs/screenshots/06-adivinador-movil.png) | ![Vista con pistas](docs/screenshots/07-pistas.png) |

Más capturas en [`docs/screenshots`](docs/screenshots).

### Reglas de secreto (anti-spoiler)

La sorpresa se protege en el **servidor**, no en la interfaz:

- El mazo de la partida vive solo en memoria del servidor: **no existe ningún
  endpoint que lo devuelva**, ni completo ni parcial.
- El estado que recibe quien adivina se serializa aparte
  (`lib/view.ts`): nunca incluye el nombre ni la imagen de su personaje, solo la
  máscara (`••••• •••••`), la categoría y las pistas que ya pagó.
- Las respuestas se validan en el servidor (`lib/game.ts`): el cliente solo
  recibe `correct: true/false`, nunca una pista de cuánto se acercó.
- Las pistas se revelan de una en una y se **censura** cualquier aparición del
  nombre del personaje dentro del texto (`redact()` en `lib/text.ts`).
- No hay buscador, listado ni autocompletado de personajes en ninguna pantalla.

### Fuentes de personajes (todas gratuitas y sin API key)

| Categoría | API | Qué aporta |
| --- | --- | --- |
| Actores y actrices | [TVmaze](https://www.tvmaze.com/api) | Personas reales del reparto de series populares |
| Personajes de series | [TVmaze](https://www.tvmaze.com/api) | Personajes de ficción con foto |
| Anime y manga | [AniList](https://anilist.gitbook.io/anilist-apiv2-docs) | Los personajes más votados, con su serie y géneros |
| Música | [Deezer](https://developers.deezer.com/api) | Artistas del top por género, con su canción más escuchada |
| DreamWorks | [DreamWorks Wiki](https://dreamworks.fandom.com) | Shrek, Kung Fu Panda, Madagascar, Dragons… vía la API de MediaWiki |
| Pixar | [Pixar Wiki](https://pixar.fandom.com) | Toy Story, Del revés, Cars… vía la API de MediaWiki |
| Superhéroes | [Superhero API](https://akabab.github.io/superhero-api/) | Marvel, DC y compañía, con estadísticas y afiliaciones |
| Harry Potter | [HP-API](https://hp-api.onrender.com) | Casa, varita, patronus y quién le pone cara |
| Libros | [Open Library](https://openlibrary.org/developers/api) | Autores y autoras, con portada y títulos |
| Pokémon | [PokéAPI](https://pokeapi.co) | Nombre en español, tipos y texto de la Pokédex |
| Rick and Morty | [Rick and Morty API](https://rickandmortyapi.com) | Personajes del multiverso |
| Disney | [Disney API](https://disneyapi.dev) | Personajes con sus películas |
| Star Wars | [SWAPI](https://swapi.info) | Personajes de la saga y su planeta natal |

Cada partida pide páginas, géneros y offsets **aleatorios**, mezcla las
categorías en round-robin y descarta repetidos, así que dos partidas seguidas
no comparten personajes. Si una API falla, el resto sigue alimentando el mazo.

Los dos mazos de animación leen la API estándar de MediaWiki que expone cada
wiki de Fandom: se sortea una categoría de personajes, se quedan los artículos
más largos (la señal más fiable de que el personaje es conocido) y las pistas se
arman con las categorías de cada ficha, comprobando contra el propio wiki qué
categorías son películas de verdad y cuáles son solo etiquetas.

### Puntuación

- Acertar: `120 − segundos usados − 20 × pistas`, con un mínimo de 25 puntos.
- El resto del grupo gana 15 puntos por ronda acertada (es cooperativo).
- Rendirse o quedarse sin tiempo: 0 puntos, y se revela el personaje.
- El historial guarda todas las rondas de todas las partidas de la sala.

## Los otros cinco juegos

Todos comparten el mismo motor de mesa (`lib/engine`): turnos, historial público,
libreta privada, reglas dentro del juego y revancha sin salir de la sala.

| Juego | Jugadores | Qué trae |
| --- | --- | --- |
| 🔴 **Conecta 4** | 2 | Tablero de 7×6 con gravedad, ficha que cae animada, detección de línea en cualquier dirección y tablas si se llena. |
| 🚢 **Batalla naval** | 2 | Cinco barcos que se colocan a mano o al azar, validación de solapes, disparos por turnos (acertar da otro tiro) y barcos que se revelan al hundirse. |
| 🃏 **UNO** | 2-8 | Baraja completa de 108 cartas, salta, cambio de sentido, +2, comodines y +4, robo con opción de jugar la carta robada, remezcla del descarte y canto automático de ¡UNO! |
| 🕵️ **Cluedo** | 3-6 | 21 cartas, solución oculta, mansión de nueve habitaciones con pasadizos secretos, dado, sugerencias, refutaciones privadas, acusación final y **cuadrícula de descartes** personal. |
| 🏦 **Monopolio** | 2-6 | Las 40 casillas, alquileres con color completo, casas y hoteles parejos, hipotecas, cárcel con fianza y dobles, mazos de Suerte y Caja de comunidad, deudas, quiebras y tratos entre jugadores. |

### Lo que cada quien ve

El corte de lo privado se hace en el servidor, en la función `view()` de cada
juego, igual que con la carta de ¿Quién soy?:

- **UNO**: tú ves tu mano; del resto solo viaja cuántas cartas llevan.
- **Batalla naval**: tú ves tu flota entera; del mar contrario solo tus disparos
  y los barcos ya hundidos.
- **Cluedo**: tus cartas y las que te han enseñado a ti. La mesa se entera de
  *quién* refutó, nunca de *qué* carta era.
- **Monopolio**: el dinero y las propiedades son públicos, como en la mesa real.
- **La libreta** (y la cuadrícula del Cluedo) nunca salen hacia otros jugadores.

### Simplificaciones, dichas de frente

- **Monopolio** no hace subastas: si rechazas una calle, se queda sin dueño.
  Tampoco hay límite de casas del banco.
- **Cluedo** mueve de habitación en habitación: el dado marca cuántas puertas
  puedes cruzar, en vez de casillas sueltas por los pasillos.
- **UNO** no acumula +2 sobre +2, y no hay penalización por olvidar cantar UNO:
  se canta solo.

## Diseño

Estética de juego de mesa impreso, no de panel de control: fondo de papel con
trama de puntos, cartas blancas con borde de tinta de 3 px y sombra dura sin
desenfoque, botones que se hunden al pulsarlos, colores planos y saturados
(nada de degradados ni cristal esmerilado) y tipografía Fredoka para los
titulares. El personaje oculto se presenta como una carta boca abajo con una
casilla vacía por letra, y las respuestas del grupo son tres teclas grandes
pensadas para el pulgar.

## Stack

- **Next.js 16** (App Router, Route Handlers, Turbopack) + **React 19** + TypeScript
- **Tailwind CSS v4** con tokens propios (`ink`, `paper`, `sun`, `tomato`…), utilidades `sheet` / `press` y animaciones de cartón
- Estado de sesión **en memoria del servidor** (`lib/store.ts`) y sincronización
  por *polling* cada 1,2 s — sin base de datos ni servicios externos

```
app/
  page.tsx                  Portada con el catálogo de juegos
  s/[code]/page.tsx         Sala de ¿Quién soy?
  mesa/[code]/page.tsx      Mesa de los otros cinco juegos
  api/sessions/…            ¿Quién soy?: crear, estado filtrado y acciones
  api/rooms/…               Mesa: crear, estado filtrado y jugadas
  api/lookup                Resuelve a qué sala pertenece un código
components/
  Landing, Room, Play…      ¿Quién soy?
  Mesa, Notepad, RulesPanel Armazón común de mesa
  games/                    Un tablero por juego
lib/
  game.ts / view.ts         Reglas y recorte de ¿Quién soy?
  engine/                   Motor de mesa: salas, turnos, libretas, vistas
  games/                    Un módulo de reglas por juego + registro
  providers/                Un módulo por API pública de personajes
  store.ts                  Salas en memoria
```

## Ejecutar en local

```bash
npm install
npm run dev          # http://localhost:3000
```

Para probar con varios jugadores en el mismo equipo, abre la sala en una
ventana normal y en otra de incógnito (la identidad se guarda por sala en
`localStorage`).

```bash
npm run build && npm start   # producción
npm run lint                 # eslint
npm run typecheck            # tsc --noEmit
```

## Despliegue

Las sesiones viven en memoria del proceso, así que la app necesita ejecutarse
como **un único servidor Node** (`npm run build && npm start`) en algo tipo
Railway, Render, Fly.io o un VPS. En un entorno *serverless* con varias
instancias (por ejemplo Vercel con escalado) cada petición podría caer en un
proceso distinto y perder la sala: para ese caso basta con reemplazar
`lib/store.ts` por Redis/Upstash manteniendo la misma interfaz
(`getSession`, `saveSession`, `putSession`).

Las salas inactivas se descartan automáticamente a las 6 horas.
