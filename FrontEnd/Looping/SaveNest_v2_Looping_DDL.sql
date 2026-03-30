-- SaveNest v2 - DDL pour retroconception Looping 4.1
-- Base cible : un favori appartient a une seule categorie
-- Une categorie peut etre partagee a d'autres utilisateurs
-- Fichier volontairement limite au DDL, sans INSERT, pour simplifier l'import dans Looping

CREATE TABLE roles (
  id_role INT NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  role_label VARCHAR(50) NOT NULL,
  CONSTRAINT pk_roles PRIMARY KEY (id_role),
  CONSTRAINT uk_roles_code UNIQUE (role_code),
  CONSTRAINT uk_roles_label UNIQUE (role_label)
);

CREATE TABLE savenest (
  id_savenest INT NOT NULL,
  date_inscription DATETIME NOT NULL,
  CONSTRAINT pk_savenest PRIMARY KEY (id_savenest)
);

CREATE TABLE language_ (
  id_language INT NOT NULL,
  language_name VARCHAR(50) NOT NULL,
  language_icon VARCHAR(10),
  CONSTRAINT pk_language PRIMARY KEY (id_language),
  CONSTRAINT uk_language_name UNIQUE (language_name)
);

CREATE TABLE user_ (
  id_user INT NOT NULL,
  pseudo VARCHAR(50) NOT NULL,
  mail VARCHAR(150) NOT NULL,
  password VARCHAR(255) NOT NULL,
  id_savenest INT NOT NULL,
  id_role INT NOT NULL,
  CONSTRAINT pk_user PRIMARY KEY (id_user),
  CONSTRAINT uk_user_pseudo UNIQUE (pseudo),
  CONSTRAINT uk_user_mail UNIQUE (mail),
  CONSTRAINT fk_user_savenest FOREIGN KEY (id_savenest) REFERENCES savenest (id_savenest),
  CONSTRAINT fk_user_role FOREIGN KEY (id_role) REFERENCES roles (id_role)
);

CREATE TABLE category (
  id_category INT NOT NULL,
  category_name VARCHAR(50) NOT NULL,
  confidentiality SMALLINT NOT NULL,
  password VARCHAR(255),
  id_user INT NOT NULL,
  CONSTRAINT pk_category PRIMARY KEY (id_category),
  CONSTRAINT uk_category_user_name UNIQUE (id_user, category_name),
  CONSTRAINT fk_category_user FOREIGN KEY (id_user) REFERENCES user_ (id_user)
);

CREATE TABLE favs (
  id_favs INT NOT NULL,
  title_favs VARCHAR(150) NOT NULL,
  url_favs VARCHAR(500),
  added_date DATE,
  logo VARCHAR(150),
  id_category INT NOT NULL,
  CONSTRAINT pk_favs PRIMARY KEY (id_favs),
  CONSTRAINT fk_favs_category FOREIGN KEY (id_category) REFERENCES category (id_category)
);

CREATE TABLE speaking (
  id_user INT NOT NULL,
  id_language INT NOT NULL,
  CONSTRAINT pk_speaking PRIMARY KEY (id_user, id_language),
  CONSTRAINT fk_speaking_user FOREIGN KEY (id_user) REFERENCES user_ (id_user),
  CONSTRAINT fk_speaking_language FOREIGN KEY (id_language) REFERENCES language_ (id_language)
);

CREATE TABLE category_shares (
  id_category INT NOT NULL,
  id_user INT NOT NULL,
  access_level VARCHAR(20) NOT NULL,
  shared_at DATETIME NOT NULL,
  CONSTRAINT pk_category_shares PRIMARY KEY (id_category, id_user),
  CONSTRAINT fk_category_shares_category FOREIGN KEY (id_category) REFERENCES category (id_category),
  CONSTRAINT fk_category_shares_user FOREIGN KEY (id_user) REFERENCES user_ (id_user)
);
