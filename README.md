# Entrenador Toucan

Entrenador local para un teclado Toucan con ZMK. Abre `entrenador-toucan.html` en Chrome o Edge y conserva la carpeta `assets` a su lado. No requiere instalación, servidor, conexión a Internet ni dependencias de ejecución.

## Practicar

1. Elige la distribución que tienes activa en Windows: inglés internacional, inglés de EE. UU. o español latinoamericano.
2. Haz clic en **Tu espacio de práctica** y escribe el texto indicado. El campo reconoce el carácter producido por Windows, incluidas las tildes compuestas y Bloq Mayús.
3. Tab, flechas y atajos conservan su funcionamiento en los controles. Para pegar material de práctica, usa la lección **Texto propio…**.

Las pistas muestran combinaciones directas o secuencias de acento y letra. Cuando una configuración no permite escribir ciertos caracteres, se avisa de las omisiones. La lectura de `mod-tap` conserva las acciones de pulsar y mantener; las combinaciones que requieren mantener y pulsar la misma tecla no se sugieren.

Las cifras corresponden a la sesión actual. Las palabras por minuto usan cinco caracteres por palabra y el tiempo transcurrido desde la primera pulsación, incluidas las líneas parciales. El tiempo se pausa al salir del campo, cambiar de lección, abrir el asistente o abandonar la ventana. Las pausas dentro del campo mientras se mantiene el foco sí cuentan. El historial por carácter se guarda al completar una línea o salir de la práctica.

## Configuraciones

**Cargar configuración** admite el JSON incluido y los archivos exportados por el entrenador. Se validan todas las capas, referencias, asignaciones y dimensiones antes de sustituir o guardar el teclado. El límite es 1 MB. Los archivos exportados incluyen `version: 1`; también se aceptan los anteriores sin versión.

Si los datos guardados son inválidos, la aplicación recupera el teclado de fábrica. El archivo `toucan-propuesta.json` conserva la propuesta original. `key press list.txt` es una referencia de nombres HID; la aplicación no lo carga.

**Leer mi teclado** necesita el teclado conectado por USB, un navegador con Web Serial y ZMK Studio cerrado. La lectura no escribe cambios en el firmware. La distribución que recomienda **Tu configuración** se aplica manualmente en ZMK Studio.

## Código y comprobaciones

- `assets/estilos.css`: paleta Japandi, modos claro y oscuro y adaptación a pantallas pequeñas.
- `assets/modelo.js`: asignaciones, validación, recetas de escritura y optimización de la distribución.
- `assets/zmk.js`: protocolo de lectura USB y conversión de comportamientos.
- `assets/entrenador.js`: práctica, entrada de texto, estadísticas, representación y asistente.

Las pruebas de regresión usan solo los módulos incluidos en Node.js:

```sh
node --test tests/entrenador.test.cjs
```

Cubren importaciones inválidas, recuperación de datos, escape de HTML, tildes, composición, mayúsculas, tiempo de sesión, navegación y `mod-tap`. La comunicación con el dispositivo requiere una comprobación adicional con el teclado físico.
