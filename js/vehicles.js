/* ==========================================================================
   Mendoza Automoción · Stock
   --------------------------------------------------------------------------
   Stock real, tomado de mendozaautomocion.com (noviembre de 2026).
   Fotos en img/stock/<id>-<n>.jpg (la 0 es la principal).

   Cómo añadir un vehículo: copia un bloque { ... }, cambia los datos y
   guarda sus fotos con el mismo id. "tipo" es "coche" o "moto".
   "precio": null muestra "Consultar".
   ========================================================================== */

window.VEHICLES = [
  { id: 233, tipo: "coche", marca: "Toyota", modelo: "Land Cruiser 2.8 Automático 7 plazas", anio: 2022, km: 60000, cv: 185, combustible: "Diésel", precio: 53990, garantia: "12 meses", fotos: 5, destacado: true },
  { id: 232, tipo: "coche", marca: "Mercedes-Benz", modelo: "Marco Polo Horizon 220 d", anio: 2022, km: 39000, cv: 163, combustible: "Diésel", precio: 53990, garantia: "12 meses", fotos: 4 },
  { id: 173, tipo: "coche", marca: "Porsche", modelo: "Cayenne Turbo", anio: 2012, km: 182000, cv: 500, combustible: "Gasolina", precio: 36990, garantia: "12 meses", fotos: 4 },
  { id: 171, tipo: "coche", marca: "BMW", modelo: "M3 Cabrio V8 (E93)", anio: 2008, km: 114000, cv: 420, combustible: "Gasolina", precio: 44990, garantia: "12 meses", fotos: 4 },
  { id: 146, tipo: "coche", marca: "MINI", modelo: "John Cooper Works GP", anio: 2012, km: 126000, cv: 218, combustible: "Gasolina", precio: 28990, garantia: "12 meses", fotos: 4 },
  { id: 237, tipo: "coche", marca: "Lexus", modelo: "IS 300h", anio: 2018, km: 134000, cv: 223, combustible: "Híbrido", precio: 25990, garantia: "12 meses", fotos: 4 },
  { id: 217, tipo: "coche", marca: "Mercedes-Benz", modelo: "SLK 280 Automático", anio: 2008, km: 86000, cv: 231, combustible: "Gasolina", precio: 17900, garantia: "12 meses", fotos: 4 },
  { id: 231, tipo: "coche", marca: "Honda", modelo: "Civic Type R", anio: 2007, km: 103000, cv: 200, combustible: "Gasolina", precio: 19890, garantia: "12 meses", fotos: 4 },
  { id: 242, tipo: "coche", marca: "Lexus", modelo: "SC430 V8", anio: 2003, km: 164000, cv: 286, combustible: "Gasolina", precio: 21900, garantia: "12 meses", fotos: 4 },
  { id: 210, tipo: "coche", marca: "Toyota", modelo: "Yaris Hybrid 20 Aniversario", anio: 2018, km: 21000, cv: 101, combustible: "Híbrido", precio: 14900, garantia: "72 meses", fotos: 4 },
  { id: 240, tipo: "coche", marca: "Renault", modelo: "Grand Scénic 7 plazas", anio: 2018, km: 129000, cv: 115, combustible: "Gasolina", precio: 13890, garantia: "12 meses", fotos: 4 },
  { id: 238, tipo: "coche", marca: "BMW", modelo: "318d (F30)", anio: 2014, km: 196000, cv: 143, combustible: "Diésel", precio: 10990, garantia: "12 meses", fotos: 4 },
  { id: 227, tipo: "coche", marca: "Nissan", modelo: "Micra 1.0 DIG-T", anio: 2019, km: 68000, cv: 120, combustible: "Gasolina", precio: 10900, garantia: "12 meses", fotos: 4 },
  { id: 223, tipo: "coche", marca: "Seat", modelo: "Ibiza 1.0 TSI", anio: 2017, km: 117000, cv: 95, combustible: "Gasolina", precio: 9890, garantia: "12 meses", fotos: 4 },
  { id: 236, tipo: "coche", marca: "BMW", modelo: "318i (E90)", anio: 2007, km: 153000, cv: 120, combustible: "Gasolina", precio: 6890, garantia: "12 meses", fotos: 4 },
  { id: 241, tipo: "coche", marca: "Fiat", modelo: "Panda 1.2", anio: 2014, km: 166000, cv: 69, combustible: "Gasolina", precio: 5690, garantia: "12 meses", fotos: 4 },

  { id: 212, tipo: "moto", marca: "BMW", modelo: "S 1000 XR", anio: 2024, km: 28500, cv: 170, combustible: "Gasolina", precio: 17900, garantia: "12 meses", fotos: 3 },
  { id: 220, tipo: "moto", marca: "BMW", modelo: "F 900 GS", anio: 2024, km: 14000, cv: 106, combustible: "Gasolina", precio: 12990, garantia: "12 meses", fotos: 3 },
  { id: 239, tipo: "moto", marca: "BMW", modelo: "R 12 GS", anio: 2025, km: 8000, cv: 109, combustible: "Gasolina", precio: null, garantia: "12 meses", fotos: 1 }, // REVISAR: en la web actual figura 154.690 €
  { id: 228, tipo: "moto", marca: "Ducati", modelo: "Hypermotard", anio: 2022, km: 23000, cv: 114, combustible: "Gasolina", precio: 8990, garantia: "12 meses", fotos: 1 },
  { id: 229, tipo: "moto", marca: "Aprilia", modelo: "Tuono 1000 R", anio: 2008, km: 41000, cv: null, combustible: "Gasolina", precio: 4690, garantia: "12 meses", fotos: 1 }
];

/* ==========================================================================
   Vendidos: una selección de los que ya tienen nuevo dueño
   (fotos en img/vendidos/<id>.jpg)
   ========================================================================== */
window.SOLD = [
  { id: 169, nombre: "BMW M2 (G87)", anio: 2024, km: 1400 },
  { id: 168, nombre: "Porsche Taycan 4 Cross Turismo", anio: 2022, km: 54000 },
  { id: 204, nombre: "Mercedes-AMG A 45 S", anio: 2020, km: 88500 },
  { id: 130, nombre: "BMW i4 xDrive40", anio: 2024, km: 2000 },
  { id: 144, nombre: "Toyota GR86", anio: 2023, km: 1800 },
  { id: 206, nombre: "MINI John Cooper Works", anio: 2025, km: 3600 },
  { id: 207, nombre: "BMW iX2 eDrive20", anio: 2024, km: 20000 },
  { id: 174, nombre: "Mercedes-Benz X 250 d", anio: 2020, km: 48000 },
  { id: 113, nombre: "Hyundai i30 N Fastback", anio: 2019, km: 68000 },
  { id: 30, nombre: "BMW Z4 sDrive", anio: 2019, km: 59000 },
  { id: 43, nombre: "Réplica Cobra V8", anio: 2014, km: 14000 },
  { id: 73, nombre: "Abarth 124 Spider", anio: 2019, km: 108000 },
  { id: 124, nombre: "Mercedes-Benz CLA 200 d AMG", anio: 2018, km: 49000 },
  { id: 110, nombre: "Mercedes-Benz GLA 200 d", anio: 2019, km: 34000 },
  { id: 198, nombre: "MINI Cooper Classic", anio: 2025, km: 5000 }
];

/* Total de vehículos vendidos que figuran en la web actual (para el contador) */
window.SOLD_TOTAL = 130;
