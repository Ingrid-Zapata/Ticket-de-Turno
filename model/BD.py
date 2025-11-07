import pymysql
import logging
import os

logging.basicConfig(level=logging.INFO)

class DB:
    """
    Clase DB implementando el patrón de diseño Singleton.
    Esto asegura que solo exista una instancia de la conexión a la base de datos
    en toda la aplicación, optimizando recursos y evitando múltiples conexiones.
    """
    _instance = None
    _conn = None
    _cursor = None
    
    def __new__(cls):
        """
        Implementación del patrón Singleton.
        Si no existe una instancia, crea una nueva. Si ya existe, retorna la misma.
        """
        if cls._instance is None:
            cls._instance = super(DB, cls).__new__(cls)
            cls._instance._initialize_connection()
        return cls._instance
    
    def _initialize_connection(self):
        """Inicializa la conexión a la base de datos una sola vez."""
        if self._conn is None:
            try:
                self._conn = pymysql.connect(
                    host=os.getenv("MYSQL_HOST", "localhost"),
                    port=int(os.getenv("MYSQL_PORT", 3306)),
                    user=os.getenv("MYSQL_USER", "root"),
                    password=os.getenv("MYSQL_PASSWORD", "1234"),
                    db=os.getenv("MYSQL_DATABASE", "turnos_db"),
                    charset='utf8',
                    autocommit=True,
                    cursorclass=pymysql.cursors.DictCursor
                )
                self._cursor = self._conn.cursor()
                logging.info("✅ Conexión a la base de datos establecida correctamente (Singleton).")
            except Exception as e:
                logging.error(f"❌ Error al conectar a la base de datos: {e}")
    
    @property
    def conn(self):
        """Retorna la conexión activa."""
        if self._conn is None or not self._conn.open:
            self._initialize_connection()
        return self._conn
    
    @property
    def cursor(self):
        """Retorna el cursor activo."""
        if self._cursor is None:
            self._initialize_connection()
        return self._cursor

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
            if self._cursor:
                self._cursor.close()
            if self._conn:
                self._conn.close()
            logging.info("🔒 Conexión cerrada correctamente.")
        except Exception as e:
            logging.error(f"❌ Error al cerrar la conexión: {e}")

