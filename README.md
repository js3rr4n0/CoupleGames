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
4. Si la carta no convence, **el grupo la cambia**: otra del mismo mazo, una de
   otro mazo, o eligiendo entre tres candidatos con su foto. Quien adivina no ve
   nada de eso, solo que el nombre oculto ha cambiado de largo.
5. Quien adivina **escribe su pregunta** (o la dice en voz alta): aparece en la
   pantalla del resto, que responde con los botones **Sí / No / Quizá**, y cada
   respuesta queda pegada a su pregunta. Puede gastar hasta **6 pistas**
   (−15 puntos cada una) antes de arriesgar un nombre.
6. Acertar rápido da más puntos; el resto del grupo también suma por ayudar.
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
- Los candidatos que el grupo baraja al cambiar de carta se sirven solo a quien
  no está adivinando; a quien adivina le llega una lista vacía.

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

**Solo personajes principales.** Cada mazo filtra el relleno con la señal que
tenga a mano: TVmaze da el reparto ordenado por importancia (y se descartan las
series de animación, donde solo hay actores de voz), AniList ordena por
favoritos, Deezer por el top, Disney exige un mínimo de apariciones en películas
y series, los wikis miden el tamaño del artículo, Rick and Morty cuenta
episodios, Star Wars películas y la API de superhéroes se mira cuánta ficha real
trae cada uno. Pokémon tira sobre todo de la primera generación.

Los dos mazos de animación leen la API estándar de MediaWiki que expone cada
wiki de Fandom: se sortea una categoría de personajes, se quedan los artículos
más largos (la señal más fiable de que el personaje es conocido) y las pistas se
arman con las categorías de cada ficha, comprobando contra el propio wiki qué
categorías son películas de verdad y cuáles son solo etiquetas.

### Puntuación

- Acertar: `120 − segundos usados − 15 × pistas`, con un mínimo de 20 puntos.
- Las rondas pueden ser de 60, 90, 120 o 180 segundos, o **sin límite (∞)** para
  jugar sin reloj.
- El resto del grupo gana 15 puntos por ronda acertada (es cooperativo).
- Rendirse o quedarse sin tiempo: 0 puntos, y se revela el personaje.
- El historial guarda todas las rondas de todas las partidas de la sala.

## Jugar sin gente: los robots

Si no hay nadie a mano, el anfitrión añade **robots** desde el lobby (🤖 *Añadir
robot*) y la mesa se completa sola. No hacen falta claves ni servicios externos:
cada robot es una función del propio servidor que decide en milisegundos, con
una pausa de un segundo para que se le vea jugar.

Lo importante: **el robot solo ve lo que vería en su silla**. Usa su mano, sus
propios disparos y lo que le han enseñado; nunca la solución del Cluedo, la
flota ajena ni las cartas del resto.

| Juego | Cómo juega el robot |
| --- | --- |
| Conecta 4 | Gana si puede, tapa si le van a ganar, descarta las columnas que regalan la jugada siguiente y, en igualdad, tira al centro. |
| Batalla naval | Coloca al azar y luego caza: cuando toca un barco sigue por las casillas contiguas, y si no tiene rastro barre en damero. |
| UNO | Guarda los comodines para el final, suelta +2 y salta cuando alguien está a punto de cantar UNO y elige el color del que más cartas tiene. |
| Cluedo | Lleva su propia deducción con lo que le han enseñado, se mueve a las habitaciones que aún no descarta y acusa en cuanto solo queda una combinación. |
| Monopolio | Compra dejándose un colchón (y siempre si completa color), construye con el grupo entero, hipoteca para pagar deudas y solo acepta tratos que le convienen. |

¿Quién soy? no tiene robots: hace falta alguien de carne y hueso que oiga la
pregunta y conteste sí o no.

## Los otros cinco juegos

Todos comparten el mismo motor de mesa (`lib/engine`): turnos, historial público,
libreta privada, reglas dentro del juego y revancha sin salir de la sala.

| Juego | Jugadores | Qué trae |
| --- | --- | --- |
| 🔴 **Conecta 4** | 2 | Tablero de 7×6 con gravedad, ficha que cae animada, detección de línea en cualquier dirección y tablas si se llena. |
| 🚢 **Batalla naval** | 2 | Cinco barcos que se colocan a mano o al azar, validación de solapes, disparos por turnos (acertar da otro tiro) y barcos que se revelan al hundirse. |
| 🃏 **UNO** | 2-8 | **Mesa redonda de verdad**: el mazo y el montón en el centro, cada quien sentado en su lado y viendo la mesa desde ahí, cartas que caen desordenadas, mano en abanico, baraja completa de 108 cartas y canto automático de ¡UNO! |
| 🕵️ **Cluedo** | 3-6 | 21 cartas, solución oculta, mansión con pasadizos, **tutorial de 30 segundos**, una barra que dice en todo momento qué toca hacer y una **libreta que deduce contigo**. |
| 🏦 **Monopolio** | 2-6 | Tablero grande y legible, **dados que ruedan**, **ficha que recorre casilla a casilla**, cartas de Suerte a pantalla, cada cobro y cada pago anunciados, alquileres, casas, hipotecas, cárcel, deudas, quiebras y tratos. |

### Todo se juega desde el móvil

La mesa está pensada para el teléfono primero, y cada juego se adapta a lo que
hay de pantalla:

- **Conecta 4**: la columna entera es el botón, no una flechita.
- **Batalla naval**: en el móvil los dos mares van en pestañas y se cambia solo
  al tuyo cuando colocas y al del rival cuando toca disparar.
- **UNO**: la mesa se mide contra sí misma (container queries), así que se
  encoge entera sin que nada se salga, y la mano se reparte en filas sin
  solapes: cada carta es un blanco cómodo.
- **Cluedo**: mansión, cartas, libreta y sospechas de la mesa van en cuatro
  pestañas en vez de una página de cuatro metros.
- **Monopolio**: el tablero no se encoge hasta ser ilegible, se desliza de lado
  y **se mueve solo para seguir a la ficha** que está jugando.
- La cabecera se queda en iconos, el papel llega hasta el borde en los móviles
  con muesca y se puede hacer zoom (nadie debería quedarse sin leer una carta).

Comprobado a 320 px, 390 px, tumbado y en tableta: ninguna pantalla obliga a
desplazarse de lado, salvo los dos tableros que lo hacen a propósito dentro de
su propia caja.

### La mesa se oye y se mueve

Hay sonido de mesa —dados, cartas, monedas, la ficha saltando— y se puede
silenciar con el 🔊 de la cabecera; la decisión se recuerda en cada aparato. No
hay ni un archivo de audio: cada efecto se fabrica al vuelo con WebAudio
(`lib/sfx.ts`), así que no se descarga nada. Las animaciones respetan
`prefers-reduced-motion`.

### La libreta del Cluedo piensa contigo

La cuadrícula ya no es solo un bloc: marca sola, y con candado, todo lo que
consta con certeza —tus cartas, las que te han enseñado y quién dijo en voz alta
que no podía refutar— y encima va contando cuántas cartas quedan por tipo en el
sobre. Cuando de un tipo solo queda una, te lo dice. Todo sale de lo que esa
persona ha visto con sus propios ojos (`lib/games/cluedo-deduce.ts`): la solución
no se mira nunca. Las marcas a mano se pintan al instante y viajan al servidor
por detrás, así que no parpadean ni se pierden entre sondeos.

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

## Dónde viven las salas

Las salas están en memoria para ir rápidas, pero se copian a disco en cuanto
cambia algo (con un retardo de 0,7 s para no escribir en cada clic). Al arrancar,
el servidor las vuelve a cargar tal cual estaban: **un reinicio o un despliegue
ya no se lleva por delante una partida a medias**. Está probado matando el
proceso con `kill -9` en mitad de una ronda.

Los ficheros van a `.couplegames-data/` (configurable con
`COUPLEGAMES_DATA_DIR`, y con el directorio temporal del sistema como
alternativa si esa carpeta no se puede escribir). No se versionan y contienen el
estado de las partidas, incluidos los personajes secretos: son datos del
servidor, igual que la memoria.

Las salas inactivas se descartan a las 6 horas.

### Despliegue

**En un servidor Node único** (Railway, Render, Fly.io, un VPS: `npm run build &&
npm start`) no hay nada que configurar. La copia en disco cubre reinicios y
despliegues.

**En Vercel, Netlify o cualquier *serverless*** hace falta un almacén
compartido: allí cada petición puede atenderla una instancia distinta, que no
conoce la memoria ni el disco de las demás, así que una sala creada en una se
pierde en la siguiente. La app lo detecta y lo avisa en pantalla.

Se arregla en un minuto y sin tocar código, porque la app habla la API REST de
Redis sin dependencias:

1. En el panel de Vercel: **Storage → Create → Upstash Redis** (tiene plan
   gratuito) y **Connect** al proyecto.
2. Vuelve a desplegar.

Eso inyecta las variables que la app busca sola: `KV_REST_API_URL` y
`KV_REST_API_TOKEN` (o `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`).
Si están, las salas viven ahí, con caducidad de 6 horas; si no están, todo sigue
en memoria y disco como siempre.

Una advertencia honesta: las escrituras van sin bloqueo, así que si dos personas
juegan exactamente en el mismo instante desde instancias distintas, gana la
última. En juegos por turnos, con un sondeo por segundo, no se nota.
