# Recompilar tailwind.css

Cada vez que se agreguen o cambien clases de Tailwind en `index.html`, desde la carpeta `tools`:

    npx tailwindcss@3.4.17 -c tailwind.config.js -i tailwind.input.css -o ../tailwind.css --minify
