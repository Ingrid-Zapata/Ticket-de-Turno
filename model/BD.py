import pymysql
import logging
import os

logging.basicConfig(level=logging.INFO)

class DB:
    def __init__(self):
        self.conn = None
        self.cursor = None
        try:
            self.conn = pymysql.connect(
                host=os.getenv("MYSQL_HOST", "localhost"),
                port=int(os.getenv("MYSQL_PORT", 3306)),
                user=os.getenv("MYSQL_USER", "root"),
                password=os.getenv("MYSQL_PASSWORD", "1234"),
                db=os.getenv("MYSQL_DATABASE", "turnos_db"),
                charset='utf8',
                autocommit=True,
                cursorclass=pymysql.cursors.DictCursor   # ✅ ESTA LÍNEA ES LA CLAVE
            )
            self.cursor = self.conn.cursor()
            logging.info("✅ Conexión a la base de datos establecida correctamente.")
        except Exception as e:
            logging.error(f"❌ Error al conectar a la base de datos: {e}")

    def execute(self, query, params=None):
        """ Ejecuta una consulta SQL, con o sin parámetros. """
        if not self.conn:
            logging.error("⚠️ No hay conexión activa para ejecutar consultas.")
            return None
        try:
            self.cursor.execute(query, params)
            return self.cursor
        except Exception as e:
            logging.error(f"❌ Error al ejecutar consulta: {e}")
            return None

    def fetch_all(self, query, params=None):
        """ Ejecuta una consulta y devuelve todos los resultados. """
        cursor = self.execute(query, params)
        return cursor.fetchall() if cursor else None

    def fetch_one(self, query, params=None):
        """ Ejecuta una consulta y devuelve solo un registro. """
        cursor = self.execute(query, params)
        return cursor.fetchone() if cursor else None

    def close(self):
        """ Cierra todo correctamente. """
        try:
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            logging.info("🔒 Conexión cerrada correctamente.")
        except Exception as e:
            logging.error(f"❌ Error al cerrar la conexión: {e}")
