<img src="./assets/banner.png" alt="@neykoor/node-cache" width="100%" />

# @neykoor/node-cache

[![npm version](https://img.shields.io/npm/v/%40neykoor%2Fnode-cache.svg)](https://www.npmjs.com/package/@neykoor/node-cache)

Cache TTL en memoria, escrita en TypeScript, sin dependencias externas.

> **No es un node-cache completo.** Este paquete no es un reemplazo genérico de `@cacheable/node-cache` ni pretende cubrir toda su API. Es una reimplementación mínima pensada específicamente para cubrir lo que necesita [BaileysX](https://github.com/Neykoor/BaileysX.git), el fork de Baileys usado en el ecosistema de bots de Neykoor. Si buscás una cache TTL de propósito general con eventos, `Keyv`, TTL en formato shorthand, etc., usá el paquete original.

## Instalación

```
npm install @neykoor/node-cache
```

npm: https://www.npmjs.com/package/@neykoor/node-cache

## Uso

```ts
import NodeCache from '@neykoor/node-cache'

const cache = new NodeCache<number>({ stdTTL: 300, useClones: false, deleteOnExpire: true, maxKeys: -1 })

cache.set('key', 1)
cache.get('key')
cache.has('key')
cache.keys()
cache.ttl('key', 60)
cache.getTtl('key')
cache.take('key')
cache.fetch('other', 60, () => computeExpensiveValue())
cache.del('key')
cache.del(['a', 'b'])
cache.mset([{ key: 'a', value: 1 }, { key: 'b', value: 2, ttl: 60 }])
cache.mget(['a', 'b'])
cache.getStats()
cache.flushStats()
cache.flushAll()
cache.close()
```

`ttl` negativo en `set`/`mset` expira la entrada de inmediato. `ttl` en `0` u omitido usa `stdTTL`, o cachea indefinidamente si `stdTTL` también es `0`.

`ttl(key)` sin segundo argumento (o con `0`) borra la entrada, igual que `del`. `getTtl(key)` devuelve el timestamp de expiración (`0` si no expira, `undefined` si la key no existe o ya expiró).

`fetch(key, ttl?, valueOrFn)` devuelve el valor cacheado si hay hit; si no, ejecuta `valueOrFn` (o usa el valor directo si no es función), lo guarda con el `ttl` dado y lo devuelve.

Con `useClones: true`, si el valor no es clonable (funciones, ciertos objetos exóticos) o `structuredClone` no existe en el runtime, se devuelve el valor original en vez de lanzar una excepción.

## Opciones del constructor

- `stdTTL`: TTL por defecto en segundos. `0` = sin expiración.
- `checkperiod`: intervalo en segundos para limpiar entradas expiradas. Default `600`.
- `useClones`: si `true`, clona el valor devuelto por `get`/`mget` con `structuredClone`. Default `true`.
- `deleteOnExpire`: si `true`, borra la entrada al detectarla expirada. Default `true`.
- `maxKeys`: cantidad máxima de keys. `-1` = sin límite (default). Al llenarse, `set()` lanza `Error('Cache max keys amount exceeded')`.

## API

| Método | Descripción |
|---|---|
| `set(key, value, ttl?)` | Guarda un valor. |
| `get(key)` | Lee un valor, o `undefined` si no existe/expiró. |
| `mset(items)` | Guarda varios valores: `{ key, value, ttl? }[]`. |
| `mget(keys)` | Lee varios valores a la vez. |
| `fetch(key, ttl?, valueOrFn)` | Get-or-compute: devuelve el cacheado o calcula, guarda y devuelve. |
| `has(key)` | Indica si la key existe y no expiró. |
| `keys()` | Lista las keys vivas (no expiradas). |
| `ttl(key, ttl?)` | Redefine el TTL de una key existente. |
| `getTtl(key)` | Devuelve el timestamp de expiración de una key. |
| `take(key)` | `get` + `del` atómico. |
| `del(key \| key[])` | Borra una key o varias. Devuelve cuántas se borraron. |
| `getStats()` | `{ hits, misses, keys, ksize, vsize }`. |
| `flushStats()` | Resetea `hits`/`misses` a `0`. |
| `flushAll()` | Vacía la cache y resetea las stats. |
| `close()` | Detiene el intervalo de limpieza (`checkperiod`). |

## Qué NO incluye

A propósito, para mantener la superficie de bugs chica:

- Eventos (`on`/`emit`, `EventEmitter`)
- TTL en formato shorthand (`'1h'`, `'30m'`)
- `forceString` / serialización automática
- `NodeCacheStore` (integración con `Keyv`)
- `objectValueSize` / `promiseValueSize` / `arrayValueSize` configurables (el tamaño en `getStats()` es una estimación simple, no exacta)

Ninguno de estos se usa en BaileysX ni en los bots del ecosistema; si en algún momento hace falta alguno, se agrega puntualmente.

## Usado por

- [BaileysX](https://github.com/Neykoor/BaileysX.git) — fork de Baileys, lo usa para `msgRetryCounterCache`, `userDevicesCache` y otras caches internas de sesión/reintentos.

## Licencia

MIT
