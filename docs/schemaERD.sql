-- Parent table 

CREATE TABLE Roles (
    role_id SERIAL PRIMARY KEY,
	name VARCHAR(255) NOT NULL CHECK (name IN ( 'manager', 'client', 'delivery_person')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP

);
-- Child of Roles table with Foreign Key
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    birthdate TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    role_id INTEGER not NULL,
    password_hash TEXT NOT NULL, 
    deleted_at TIMESTAMPTZ,
               -- Foreign Key to Roles
    CONSTRAINT fk_bridge_Roles FOREIGN KEY (role_id) 
        REFERENCES Roles(role_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE
);

CREATE TABLE Categories (
    category_id SERIAL PRIMARY KEY,
	name VARCHAR(50) NOT null,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- Parent table 
CREATE TABLE Products (
	product_id SERIAL primary key,
	name VARCHAR(200) NOT null,
	description TEXT not null,
	status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'discontinued')),
	created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    category_id INTEGER not null,
        CONSTRAINT fk_category FOREIGN KEY (category_id) 
        REFERENCES Categories(category_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE
	
);
-- Bridge/Junction Table (Many-to-Many relationship)
CREATE TABLE Product_Likes(
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite Primary Key (both FKs together form the PK)
    PRIMARY KEY (user_id, product_id),
    
    -- Foreign Key to user
    CONSTRAINT fk_bridge_users FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    
    -- Foreign Key to products
    CONSTRAINT fk_bridge_product FOREIGN KEY (product_id) 
        REFERENCES Products(product_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);




CREATE TABLE Product_Images (
    image_id SERIAL PRIMARY KEY,
	bucket_name VARCHAR(100) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    extension VARCHAR(255) NOT NULL CHECK (extension IN ('jpg', 'png', 'webp', 'gif')),
	display_order INTEGER not null,
    alt_text VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    product_id INTEGER not null,
        CONSTRAINT fk_Product FOREIGN KEY (product_id) 
        REFERENCES Products(product_id) 
        ON DELETE CASCADE  
        ON UPDATE CASCADE
);

CREATE TABLE Orders(
    order_id SERIAL PRIMARY KEY,
    total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('payment_link', 'payment_intent')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER not null,
              -- Foreign Key to user
    CONSTRAINT fk_bridge_users FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);



CREATE TABLE Order_Status_History (
    order_Status_History_id SERIAL PRIMARY KEY,
    status VARCHAR(255) NOT NULL CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'cancelled','delivered')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    changed_by_type VARCHAR(10) CHECK (changed_by_type IN ('user', 'system')),
    order_id INTEGER not null,
    changed_by_user_id INTEGER,
    changed_by_email TEXT,
    
    CHECK (
      (changed_by_type = 'user' AND changed_by_email IS NOT NULL)
      OR
      (changed_by_type = 'system' AND changed_by_user_id IS NULL AND changed_by_email IS NULL)
      OR
      (changed_by_type IS NULL)
    ),
    -- Foreign Key to orders
        CONSTRAINT fk_Orders FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) 
        ON DELETE CASCADE  
        ON UPDATE cascade,
        
          -- Foreign Key to user
    CONSTRAINT fk_bridge_users FOREIGN KEY (changed_by_user_id) 
        REFERENCES Users(user_id) 
        ON DELETE set NULL 
        ON UPDATE CASCADE
);

CREATE TABLE Product_Variants (
    product_variant_id SERIAL PRIMARY KEY,
    size VARCHAR(10) not null CHECK (size IN ('S','M','L','XL','XXL')),
    color TEXT not NULL,
    stock_quantity INTEGER not null CHECK (stock_quantity >= 0),
    sku_code VARCHAR(100) not null UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    product_id INTEGER not null,
    CONSTRAINT fk_product FOREIGN KEY (product_id)
        REFERENCES Products(product_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Order_Items: prevent same variant twice in one order; immutable once created (see block_order_items_update trigger)
CREATE TABLE Order_Items (
    order_items_id SERIAL PRIMARY KEY,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase BIGINT NOT NULL CHECK (price_at_purchase >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    order_id INTEGER not null,
    product_variant_id INTEGER not null,
    UNIQUE (order_id, product_variant_id),
        CONSTRAINT fk_Product_Variant FOREIGN KEY (product_variant_id) 
        REFERENCES Product_Variants (product_variant_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE,
        
        CONSTRAINT fk_Orders FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) 
        ON DELETE CASCADE  
        ON UPDATE CASCADE
);

CREATE TABLE Carts(
    cart_id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER not null UNIQUE,
              -- Foreign Key to user
    CONSTRAINT fk_bridge_users FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
    
);
-- Cart_Items: prevent same variant twice in one cart
CREATE TABLE Cart_Items(
    cart_items_id SERIAL PRIMARY KEY,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase BIGINT NOT NULL CHECK (price_at_purchase >= 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    product_variant_id INTEGER not null,
    cart_id INTEGER not null,
    UNIQUE (cart_id, product_variant_id),
        CONSTRAINT fk_Product_Variant FOREIGN KEY (product_variant_id) 
        REFERENCES Product_Variants (product_variant_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE,
        
        CONSTRAINT fk_Carts FOREIGN KEY (cart_id) 
        REFERENCES Carts (cart_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE
);

CREATE TABLE Payments(
    payment_id SERIAL PRIMARY KEY,
    amount BIGINT NOT NULL CHECK (amount > 0),
	method_type VARCHAR(255) NOT NULL CHECK (method_type IN ('card','bank_account','apple_pay','google_pay')),
    stripe_reference TEXT UNIQUE,
	status VARCHAR(255) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    order_id INTEGER not null,
    
        CONSTRAINT fk_Orders FOREIGN KEY (order_id) 
        REFERENCES Orders(order_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE
);

CREATE TABLE Prices_History (
    prices_History_id SERIAL PRIMARY KEY,
    price BIGINT NOT NULL CHECK (price >= 0),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    product_variant_id INTEGER not null,
    
        CONSTRAINT fk_Product_Variant FOREIGN KEY (product_variant_id) 
        REFERENCES Product_Variants (product_variant_id) 
        ON DELETE RESTRICT  
        ON UPDATE CASCADE
);

CREATE TABLE Addresses (
    address_id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL CHECK (type IN ('shipping', 'billing')),
    street1 VARCHAR(200) NOT NULL,
    street2 VARCHAR(200) NOT NULL,
    street3 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    user_id INTEGER NOT NULL,
    CONSTRAINT fk_Users FOREIGN KEY (user_id) 
        REFERENCES Users(user_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
    
);
CREATE UNIQUE INDEX idx_one_default_addresses_per_type 
ON Addresses(user_id, type) 
WHERE is_default = TRUE;

CREATE TABLE Auth_Tokens (
    token_id SERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('session', 'refresh', 'reset')),
    jti TEXT UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER NOT NULL,
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);
CREATE TABLE Order_Addresses (
  order_address_id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  type VARCHAR(50) CHECK (type IN ('shipping', 'billing')),
  street1 VARCHAR(200) NOT NULL,
  street2 VARCHAR(200) NOT NULL,
  street3 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order FOREIGN KEY (order_id) 
    REFERENCES Orders(order_id) 
    ON DELETE CASCADE,
  UNIQUE (order_id, type)
);
CREATE TABLE Stock_Notifications (
    notification_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (product_id, user_id),
    CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES Products(product_id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE TABLE Stripe_Events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'processing_failed')),
  processing_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);
CREATE INDEX idx_stripe_events_stuck ON Stripe_Events(status, processing_started_at);
CREATE INDEX idx_stock_notifications_product_id ON Stock_Notifications(product_id);

CREATE INDEX idx_orders_user_id ON Orders(user_id);
CREATE INDEX idx_order_items_order_id ON Order_Items(order_id);
CREATE INDEX idx_order_items_product_variant_id ON Order_Items(product_variant_id);
CREATE INDEX idx_cart_items_cart_id ON Cart_Items(cart_id);
CREATE INDEX idx_cart_items_product_variant_id ON Cart_Items(product_variant_id);
CREATE INDEX idx_product_variant_product_id ON Product_Variants(product_id);
CREATE INDEX idx_product_images_product_id ON Product_Images(product_id);
CREATE INDEX idx_price_history_product_variant_id ON Prices_History(product_variant_id);
CREATE INDEX idx_order_status_history_order_id ON Order_Status_History(order_id);
CREATE INDEX idx_auth_tokens_user_id ON Auth_Tokens(user_id);
CREATE INDEX idx_auth_tokens_jti ON Auth_Tokens(jti);
CREATE INDEX idx_order_addresses_order_id ON Order_Addresses(order_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_roles_updated_at
BEFORE UPDATE ON Roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_users_updated_at
BEFORE UPDATE ON Users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_categories_updated_at
BEFORE UPDATE ON Categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at
BEFORE UPDATE ON Products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON Product_Images
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_orders_updated_at
BEFORE UPDATE ON Orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON Product_Variants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION prevent_order_items_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Order_Items are immutable once created (order_items_id %)', OLD.order_items_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER block_order_items_update
BEFORE UPDATE ON Order_Items
FOR EACH ROW
EXECUTE FUNCTION prevent_order_items_update();

CREATE OR REPLACE TRIGGER update_carts_updated_at
BEFORE UPDATE ON Carts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON Cart_Items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_payments_updated_at
BEFORE UPDATE ON Payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_addresses_updated_at
BEFORE UPDATE ON Addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();