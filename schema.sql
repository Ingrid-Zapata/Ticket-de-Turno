-- Asegurarnos de que la tabla turnos tiene la estructura correcta
DROP TABLE IF EXISTS turnos;
DROP TABLE IF EXISTS persona;
DROP TABLE IF EXISTS nivel;
DROP TABLE IF EXISTS municipio;
DROP TABLE IF EXISTS asunto;
DROP TABLE IF EXISTS users;

-- Crear tablas en el orden correcto (primero las que no tienen dependencias)

-- 1) Tabla users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Tablas catálogo
CREATE TABLE nivel (
  id_nivel INT AUTO_INCREMENT PRIMARY KEY,
  nombre_nivel VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE municipio (
  id_municipio INT AUTO_INCREMENT PRIMARY KEY,
  nombre_municipio VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE asunto (
  id_asunto INT AUTO_INCREMENT PRIMARY KEY,
  nombre_asunto VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) Tabla persona
CREATE TABLE persona (
  id_persona INT AUTO_INCREMENT PRIMARY KEY,
  nombre_completo VARCHAR(120) NOT NULL,
  curp CHAR(18) NOT NULL UNIQUE,
  nombre VARCHAR(60),
  paterno VARCHAR(60),
  materno VARCHAR(60),
  telefono VARCHAR(20),
  celular VARCHAR(20),
  correo VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Tabla turnos
CREATE TABLE turnos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_turno INT NOT NULL,
  id_persona INT NOT NULL,
  id_nivel INT,
  id_municipio INT NOT NULL,
  id_asunto INT,
  user_id INT NOT NULL,
  estatus ENUM('Pendiente','Resuelto') DEFAULT 'Pendiente',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_persona) REFERENCES persona(id_persona) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (id_nivel) REFERENCES nivel(id_nivel) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (id_municipio) REFERENCES municipio(id_municipio) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (id_asunto) REFERENCES asunto(id_asunto) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_numero_municipio (numero_turno, id_municipio),
  INDEX idx_id_persona (id_persona)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) Trigger para auto-incrementar número de turno por municipio
DELIMITER $$

CREATE TRIGGER trg_turnos_numero_before_insert
BEFORE INSERT ON turnos
FOR EACH ROW
BEGIN
    DECLARE next_number INT;
    
    -- Obtener el siguiente número de turno para el municipio
    SELECT COALESCE(MAX(numero_turno), 0) + 1 INTO next_number
    FROM turnos 
    WHERE id_municipio = NEW.id_municipio;
    
    -- Si no se proporcionó número de turno o es 0, asignar el siguiente
    IF NEW.numero_turno IS NULL OR NEW.numero_turno = 0 THEN
        SET NEW.numero_turno = next_number;
    END IF;
END $$

DELIMITER ;

-- 6) Datos iniciales
INSERT INTO users (username, email, password_hash, role) VALUES
('admin', 'admin@example.com', SHA2('admin123', 256), 'admin');

INSERT INTO nivel (nombre_nivel) VALUES
('Preescolar'), ('Primaria'), ('Secundaria'), ('Bachillerato');

INSERT INTO municipio (nombre_municipio) VALUES
('Saltillo'), ('Torreón'), ('Monclova'), ('Matamoros');

INSERT INTO asunto (nombre_asunto) VALUES
('Inscripción'), ('Consulta'), ('Reporte'), ('Otro');