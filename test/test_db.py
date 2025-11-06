import pymysql

try:
    # Intentar conectar a MySQL
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='1234',  # La contraseña que estamos usando
        db='turnos_db'
    )
    print("¡Conexión exitosa!")
    print("Base de datos encontrada y accesible")
    connection.close()
except pymysql.err.OperationalError as e:
    error_code = e.args[0]
    if error_code == 1045:
        print("Error: Acceso denegado. La contraseña del usuario root es incorrecta")
    elif error_code == 1049:
        print("Error: La base de datos 'turnos_db' no existe")
    else:
        print(f"Error de conexión: {str(e)}")
except Exception as e:
    print(f"Error inesperado: {str(e)}")