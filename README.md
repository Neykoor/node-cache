# @neykoor/node-cache

Cache TTL en memoria, subconjunto reducido de la API de `@cacheable/node-cache`, con solo lo que usa BaileysX. Sin dependencias externas.

## Instalación

```
npm install @neykoor/node-cache
```

## API

```ts
import NodeCache from '@neykoor/node-cache'

const cache = new NodeCache<number>({ stdTTL: 300, useClones: false, deleteOnExpire: true })

cache.set('key', 1)
cache.get('key')
cache.has('key')
cache.del('key')
cache.mset([{ key: 'a', value: 1 }, { key: 'b', value: 2, ttl: 60 }])
cache.mget(['a', 'b'])
cache.flushAll()
cache.close()
```

`ttl` negativo en `set`/`mset` expira la entrada de inmediato (igual que `@cacheable/node-cache`). `ttl` en `0` u omitido usa `stdTTL` / cachea indefinidamente si `stdTTL` también es `0`.

Con `useClones: true`, si el valor no es clonable (funciones, ciertos objetos exóticos) o `structuredClone` no existe en el runtime, se devuelve el valor original en vez de lanzar una excepción.

## Opciones del constructor

- `stdTTL`: TTL por defecto en segundos. `0` = sin expiración.
- `checkperiod`: intervalo en segundos para limpiar entradas expiradas. Default `600`.
- `useClones`: si `true`, clona el valor devuelto por `get`/`mget` con `structuredClone`. Default `true`.
- `deleteOnExpire`: si `true`, borra la entrada al detectarla expirada. Default `true`.

## Diferencias con @cacheable/node-cache

Este paquete no incluye: eventos (`on`/`emit`), `ttl`, `getTtl`, `take`, `mdel`, `keys`, `getStats`, `flushStats`, TTL en formato shorthand (`'1h'`), `maxKeys`, ni el `NodeCacheStore` (Keyv). Ninguno de esos métodos es usado por BaileysX; se omitieron a propósito para reducir superficie de bugs.
