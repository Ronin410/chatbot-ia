-- Esquema básico de citas/pedidos para el nivel Premium.
-- Aplicar con: npm run db:migrate  (lee DATABASE_URL de .env)

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  nombre_cliente TEXT NOT NULL,
  telefono TEXT NOT NULL,
  servicio TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado TEXT NOT NULL DEFAULT 'confirmada', -- confirmada | cancelada
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numero_pedido TEXT UNIQUE NOT NULL,
  nombre_cliente TEXT NOT NULL,
  estado TEXT NOT NULL, -- recibido | en_preparacion | en_camino | entregado | cancelado
  detalle TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Datos de ejemplo para poder probar consultar_pedido sin capturar nada a mano.
INSERT INTO pedidos (numero_pedido, nombre_cliente, estado, detalle) VALUES
  ('PED-1001', 'Cliente de prueba', 'en_camino', '2 baguettes, 1 pastel de chocolate'),
  ('PED-1002', 'Cliente de prueba 2', 'entregado', '1 docena de conchas')
ON CONFLICT (numero_pedido) DO NOTHING;
