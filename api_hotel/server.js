const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// CONEXION A POSTGRESQL
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "hotel",
    password: "1234",
    port: 5432
});

// RUTA PRINCIPAL
app.get("/", (req, res) => {
    res.send("API del hotel funcionando correctamente");
});

// PROBAR CONEXION CON POSTGRESQL
app.get("/probar-bd", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW()");
        res.json(resultado.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al conectar con la base de datos" });
    }
});

// REPORTE CON GROUP BY Y HAVING
app.get("/reportes/consumos", async (req, res) => {
    try {
        const sql = `
            SELECT
                e.nombre AS nombre_empleado,
                e.apellido AS apellido_empleado,
                s.nombre_servicio,
                COUNT(c.id_consumo_srvc) AS cantidad_consumos,
                SUM(c.cantidad) AS total_cantidad,
                SUM(c.sub_total) AS total_recaudado
            FROM consumo_srvicio c
            INNER JOIN servicio s ON c.id_servicio = s.id_servicio
            INNER JOIN empleado e ON c.id_empleado = e.id_empleado
            GROUP BY e.nombre, e.apellido, s.nombre_servicio
            HAVING SUM(c.sub_total) >= 20
            ORDER BY total_recaudado DESC;
        `;

        const resultado = await pool.query(sql);
        res.json(resultado.rows);

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al generar reporte" });
    }
});

// EXPORTAR REPORTE A CSV
app.get("/reportes/consumos/exportar", async (req, res) => {
    try {
        const sql = `
            SELECT
                e.nombre AS nombre_empleado,
                e.apellido AS apellido_empleado,
                s.nombre_servicio,
                COUNT(c.id_consumo_srvc) AS cantidad_consumos,
                SUM(c.cantidad) AS total_cantidad,
                SUM(c.sub_total) AS total_recaudado
            FROM consumo_srvicio c
            INNER JOIN servicio s ON c.id_servicio = s.id_servicio
            INNER JOIN empleado e ON c.id_empleado = e.id_empleado
            GROUP BY e.nombre, e.apellido, s.nombre_servicio
            HAVING SUM(c.sub_total) >= 20
            ORDER BY total_recaudado DESC;
        `;

        const resultado = await pool.query(sql);

        let csv = "nombre_empleado,apellido_empleado,nombre_servicio,cantidad_consumos,total_cantidad,total_recaudado\n";

        resultado.rows.forEach(fila => {
            csv += `${fila.nombre_empleado},${fila.apellido_empleado},${fila.nombre_servicio},${fila.cantidad_consumos},${fila.total_cantidad},${fila.total_recaudado}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=reporte_consumos.csv");
        res.send(csv);

    } catch (error) {
        console.log(error);
        res.status(500).json({ mensaje: "Error al exportar reporte" });
    }
});

// CRUD COMPLEJO: INSERTAR RESERVA COMPLETA
// Inserta en 4 tablas: reserva, estadia, pago y detalle_pago
app.post("/reservas-completas", async (req, res) => {
    try {
        const datos = req.body;

        await pool.query(`
            INSERT INTO reserva
            (id_reserva, fch_reserva, estado_reserva, cantidad_personas, id_huesped, id_habitacion, id_empleado)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            datos.id_reserva,
            datos.fch_reserva,
            datos.estado_reserva,
            datos.cantidad_personas,
            datos.id_huesped,
            datos.id_habitacion,
            datos.id_empleado
        ]);

        await pool.query(`
            INSERT INTO estadia
            (id_estadia, fch_ingreso, fch_salida, hr_ingreso, hr_salida, id_empleado, id_reserva)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            datos.id_estadia,
            datos.fch_ingreso,
            datos.fch_salida,
            datos.hr_ingreso,
            datos.hr_salida,
            datos.id_empleado,
            datos.id_reserva
        ]);

        await pool.query(`
            INSERT INTO pago
            (id_pago, fch_pago, monto_total, estado_pago, id_reserva, id_metodo)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            datos.id_pago,
            datos.fch_pago,
            datos.monto_total,
            datos.estado_pago,
            datos.id_reserva,
            datos.id_metodo
        ]);

        await pool.query(`
            INSERT INTO detalle_pago
            (id_detalle, monto_abonado, descripcion, id_pago, id_servicio)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            datos.id_detalle,
            datos.monto_abonado,
            datos.descripcion,
            datos.id_pago,
            datos.id_servicio
        ]);

        res.json({
            mensaje: "Reserva completa registrada correctamente"
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            mensaje: "Error al registrar reserva completa"
        });
    }
});

// INICIAR SERVIDOR
app.listen(3000, () => {
    console.log("Servidor iniciado en http://localhost:3000");
});
