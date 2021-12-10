const mysql2 = require('mysql2/promise');

module.exports = class TagConfig {

    constructor() {
    }

    async getMinimo(tag) {

        const pool = mysql2.createPool({
            host: process.env.DB_host,
            user: process.env.DB_user,
            password: process.env.DB_password,
            port: process.env.DB_port,
            database: process.env.DB_database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        var sql = "";
        sql += " select minimo ";
        sql += " from tagconfig ";
        sql += " where tag ='" + tag + "'";

        const res1 = await pool.query(sql, []);

        if (res1[0].length >= 1) {
            return res1[0][0].minimo;
        } else {
            return '';
        }

    }

}
