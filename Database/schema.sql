CREATE DATABASE IF NOT EXISTS homedepo;
USE homedepo;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
SHOW tables;

ALTER TABLE users ADD COLUMN last_login_at DATETIME AFTER created_at;
ALTER TABLE users modify COLUMNmodiclast_login_device VARCHAR(255) AFTER last_login_at;
ALTER TABLE users MODIFY COLUMN last_login_at VARCHAR(50);
ALTER TABLE users ADD COLUMN last_login_location varchar(255) AFTER last_login_device;

CREATE TABLE IF NOT EXISTS stores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_slug VARCHAR(100) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT,
    brand VARCHAR(100),
    unit VARCHAR(50) NOT NULL,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_products_department (department_slug)
);

CREATE TABLE IF NOT EXISTS store_products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    store_id INT NOT NULL,
    product_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_store_products_store FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    CONSTRAINT fk_store_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_store_product UNIQUE (store_id, product_id),

    INDEX idx_store_products_store (store_id),
    INDEX idx_store_products_product (product_id)
);

INSERT INTO stores
(name, description, address, phone, email, latitude, longitude)
VALUES
('BuildRight Hardware', 'Hardware, tools and home improvement supplies.', 'Mombasa Road, Nairobi', '+254 700 111 001', 'info@buildright.example',-1.3182,    36.8955),
('HomePlus Supplies','Home essentials, furniture, appliances and lifestyle products.', 'Ngong Road, Nairobi', '+254 700 111 002','info@homeplus.example', -1.3008, 36.7821),
('Urban Home Store', 'Modern furniture, lighting, decor and home accessories.', 'Kilimani, Nairobi','+254 700 111 003','info@urbanhome.example', -1.2921, 36.7854),
('GreenLife Home & Garden', 'Outdoor, garden, fitness and lifestyle products.', 'Karen, Nairobi', '+254 700 111 004','info@greenlife.example', -1.3197, 36.7073);

INSERT INTO products
(department_slug, name, description, brand, unit, image_url)
VALUES
('furniture','3-Seater Fabric Sofa','Comfortable three-seater sofa with durable fabric upholstery.','HomeComfort','piece','/products/sofa-3-seater.jpg'),
('furniture', 'Wooden Coffee Table','Modern wooden coffee table suitable for living rooms.','OakHouse','piece','/products/coffee-table.jpg'),
('appliances','Single Door Refrigerator','Compact energy-efficient refrigerator for everyday home use.','Ramtons', 'piece','/products/refrigerator.jpg'),
('appliances','Electric Kettle 1.7L','Fast-boiling electric kettle with automatic shutoff.','Von','piece', '/products/electric-kettle.jpg'),
('entertainment','43-inch Smart TV','Full HD smart television with built-in streaming applications.','Hisense','piece','/products/smart-tv.jpg'),
('entertainment','Bluetooth Soundbar', 'Compact soundbar for improved television and music audio.','JBL','piece','/products/soundbar.jpg'),
('kitchenware','Non-Stick Cookware Set','Six-piece non-stick cookware set for everyday cooking.','Nunix','set','/products/cookware-set.jpg'),
('kitchenware','Stainless Steel Cutlery Set','Durable stainless steel cutlery set for everyday dining.','Generic','set','/products/cutlery.jpg'),
('home-decor','Decorative Wall Mirror','Modern decorative mirror suitable for bedrooms and living spaces.','HomeStyle','piece','/products/wall-mirror.jpg'),
('home-decor','Indoor Decorative Plant','Low-maintenance artificial decorative plant.','GreenDecor','piece','/products/decorative-plant.jpg'),
('seasonal','LED Christmas String Lights','Decorative LED string lights suitable for festive occasions.','FestiveGlow','set','/products/string-lights.jpg'),
('textiles', 'King Size Duvet','Soft and comfortable king-size duvet for everyday use.','SoftNest','piece','/products/king-duvet.jpg'),
('textiles','Blackout Curtains','Light-blocking curtains suitable for bedrooms and living rooms.','HomeShade','pair','/products/blackout-curtains.jpg'),
('lighting','20W LED Bulb','Energy-efficient LED bulb suitable for general indoor lighting.','Philips','piece','/products/20w-led.jpg'),
('lighting','LED Ceiling Light','Modern ceiling light for living rooms and bedrooms.','Philips','piece','/products/ceiling-light.jpg'),
('outdoor','Outdoor Garden Chair','Weather-resistant chair suitable for patios and gardens.','GardenPro','piece','/products/garden-chair.jpg'),
('outdoor','Garden Hose 20m','Flexible 20-metre hose for garden and outdoor cleaning.','AquaFlex','piece','/products/garden-hose.jpg'),
('pets','Large Dog Bed','Comfortable washable bed for medium and large dogs.','PetComfort','piece','/products/dog-bed.jpg'),
('fitness','Adjustable Dumbbell Set', 'Adjustable dumbbell set suitable for home workouts.','PowerFit','set','/products/dumbbells.jpg'),
('fitness','Yoga Mat','Non-slip exercise mat suitable for yoga and general workouts.','FitLife','piece','/products/yoga-mat.jpg');

INSERT INTO store_products
(store_id, product_id, price, stock_quantity, is_available)
VALUES
(1, 2, 4500.00, 8, TRUE),
(1, 4, 1800.00, 15, TRUE),
(1, 7, 6500.00, 5, TRUE),
(1, 14, 250.00, 43, TRUE),
(1, 15, 3200.00, 7, TRUE),
(1, 17, 2800.00, 12, TRUE),
(1, 18, 1650.00, 20, TRUE),
(2, 1, 38500.00, 4, TRUE),
(2, 3, 28500.00, 3, TRUE),
(2, 4, 1950.00, 10, TRUE),
(2, 5, 52000.00, 2, TRUE),
(2, 7, 7200.00, 6, TRUE),
(2, 8, 2500.00, 9, TRUE),
(2, 12, 6500.00, 5, TRUE),
(2, 14, 280.00, 25, TRUE),
(3, 1, 41000.00, 2, TRUE),
(3, 2, 5200.00, 6, TRUE),
(3, 5, 49500.00, 4, TRUE),
(3, 6, 8500.00, 7, TRUE),
(3, 9, 3500.00, 8, TRUE),
(3, 10, 1800.00, 15, TRUE),
(3, 14, 300.00, 0, FALSE),
(3, 15, 4200.00, 3, TRUE),
(4, 11, 1800.00, 20, TRUE),
(4, 13, 4500.00, 7, TRUE),
(4, 16, 3200.00, 11, TRUE),
(4, 17, 3000.00, 0, FALSE),
(4, 18, 1600.00, 18, TRUE),
(4, 19, 4500.00, 5, TRUE),
(4, 20, 1800.00, 14, TRUE);

INSERT INTO users (username, email, password_hash)
VALUES
('mock_user_01', 'mock.user01@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_02', 'mock.user02@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_03', 'mock.user03@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_04', 'mock.user04@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_05', 'mock.user05@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_06', 'mock.user06@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_07', 'mock.user07@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_08', 'mock.user08@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_09', 'mock.user09@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_10', 'mock.user10@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_11', 'mock.user11@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_12', 'mock.user12@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_13', 'mock.user13@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_14', 'mock.user14@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_15', 'mock.user15@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_16', 'mock.user16@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_17', 'mock.user17@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_18', 'mock.user18@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_19', 'mock.user19@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1'),
('mock_user_20', 'mock.user20@example.test', '3512d3317f961b1fe6ff49b271d6ff17ec2b5125c02d89b18a3e081b964b75a1');

INSERT INTO stores
(name, description, address, phone, email, latitude, longitude)
VALUES
('BuildRight Hardware - Westlands', 'Tools, paint and home improvement supplies.', 'Waiyaki Way, Westlands, Nairobi', '+254 711 220 001', 'westlands@buildright.example.test', -1.2676, 36.8051),
('HomePlus Supplies - Lavington', 'Furniture, appliances and everyday home essentials.', 'James Gichuru Road, Lavington, Nairobi', '+254 711 220 002', 'lavington@homeplus.example.test', -1.2782, 36.7664),
('Urban Home Store - Kilimani', 'Contemporary furniture and home accessories.', 'Argwings Kodhek Road, Kilimani, Nairobi', '+254 711 220 003', 'kilimani@urbanhome.example.test', -1.2928, 36.7872),
('GreenLife Home & Garden - Karen', 'Garden, outdoor living and fitness products.', 'Ngong Road, Karen, Nairobi', '+254 711 220 004', 'karen@greenlife.example.test', -1.3211, 36.7094),
('Nairobi Home Market - CBD', 'Home goods, kitchenware and practical household essentials.', 'Tom Mboya Street, Nairobi CBD', '+254 711 220 005', 'cbd@nairobihomemarket.example.test', -1.2841, 36.8251),
('Cozy Living - Parklands', 'Soft furnishings, bedding and decor for comfortable homes.', 'Limuru Road, Parklands, Nairobi', '+254 711 220 006', 'parklands@cozyliving.example.test', -1.2635, 36.8158),
('Kitchen Corner - South B', 'Cookware, dining accessories and small kitchen appliances.', 'Mombasa Road, South B, Nairobi', '+254 711 220 007', 'southb@kitchencorner.example.test', -1.3114, 36.8316),
('BrightHouse Electricals - Ngara', 'Lighting, electrical fittings and home appliances.', 'Thika Road, Ngara, Nairobi', '+254 711 220 008', 'ngara@brighthouse.example.test', -1.2753, 36.8259),
('Garden Gate - Runda', 'Outdoor furniture, garden tools and plant care supplies.', 'Runda Drive, Runda, Nairobi', '+254 711 220 009', 'runda@gardengate.example.test', -1.2143, 36.8039),
('Family Home Centre - Umoja', 'Affordable furnishings and household essentials.', 'Manyanja Road, Umoja, Nairobi', '+254 711 220 010', 'umoja@familyhome.example.test', -1.2796, 36.8957),
('Modern Nest - Kileleshwa', 'Modern furniture, lighting and curated home decor.', 'Ring Road Kileleshwa, Nairobi', '+254 711 220 011', 'kileleshwa@modernnest.example.test', -1.2789, 36.7864),
('Everyday Appliances - Roysambu', 'Reliable appliances and electronics for everyday use.', 'Thika Road, Roysambu, Nairobi', '+254 711 220 012', 'roysambu@everydayappliances.example.test', -1.2205, 36.8812),
('Textile House - Gikomba', 'Bedding, curtains and textiles for every room.', 'Digo Road, Gikomba, Nairobi', '+254 711 220 013', 'gikomba@textilehouse.example.test', -1.2879, 36.8351),
('Pet & Home Supplies - Langata', 'Pet comforts and useful household products.', 'Langata Road, Langata, Nairobi', '+254 711 220 014', 'langata@pethome.example.test', -1.3341, 36.7606),
('FitSpace Retail - Kilimani', 'Home fitness equipment and workout accessories.', 'Lenana Road, Kilimani, Nairobi', '+254 711 220 015', 'kilimani@fitspace.example.test', -1.2993, 36.7896),
('Seasonal Living - Two Rivers', 'Festive decor and seasonal home accessories.', 'Limuru Road, Two Rivers, Nairobi', '+254 711 220 016', 'tworivers@seasonalliving.example.test', -1.2084, 36.8041),
('Oak & Reed Furniture - Ridgeways', 'Solid wood furniture and timeless living room pieces.', 'Kiambu Road, Ridgeways, Nairobi', '+254 711 220 017', 'ridgeways@oakreed.example.test', -1.2311, 36.8402),
('Outdoor Haven - Ruaka', 'Patio furniture, garden care and outdoor living essentials.', 'Limuru Road, Ruaka, Kiambu', '+254 711 220 018', 'ruaka@outdoorhaven.example.test', -1.2029, 36.7875),
('Home Essentials - Embakasi', 'Everyday home supplies, lighting and kitchen basics.', 'Airport North Road, Embakasi, Nairobi', '+254 711 220 019', 'embakasi@homeessentials.example.test', -1.3196, 36.9001),
('The Decor Studio - Loresho', 'Decorative accents, mirrors and finishing touches.', 'Loresho Ridge, Loresho, Nairobi', '+254 711 220 020', 'loresho@decorstudio.example.test', -1.2461, 36.7738);

INSERT INTO products
(department_slug, name, description, brand, unit, image_url)
VALUES
('furniture', 'Two-Seater Loveseat', 'Compact upholstered loveseat designed for smaller living rooms.', 'HavenLiving', 'piece', '/products/loveseat.jpg'),
('furniture', 'Solid Oak Bookshelf', 'Five-shelf oak-finish bookcase for books and display pieces.', 'OakHouse', 'piece', '/products/oak-bookshelf.jpg'),
('appliances', 'Top Load Washing Machine', '7kg top-load washing machine with multiple wash programmes.', 'Ramtons', 'piece', '/products/washing-machine.jpg'),
('appliances', 'Digital Microwave Oven', '20-litre microwave oven with simple digital controls.', 'Von', 'piece', '/products/microwave-oven.jpg'),
('entertainment', '55-inch 4K Smart TV', 'Ultra HD smart television with built-in streaming apps.', 'Hisense', 'piece', '/products/4k-smart-tv.jpg'),
('entertainment', 'Wireless Bluetooth Speaker', 'Portable wireless speaker for music at home or outdoors.', 'JBL', 'piece', '/products/bluetooth-speaker.jpg'),
('kitchenware', 'Cast Iron Casserole Pot', 'Durable cast iron pot suitable for stovetop and oven cooking.', 'KitchenPro', 'piece', '/products/casserole-pot.jpg'),
('kitchenware', 'Glass Food Storage Set', 'Set of airtight glass containers for meal prep and storage.', 'FreshKeep', 'set', '/products/glass-storage-set.jpg'),
('home-decor', 'Round Wall Clock', 'Minimal round wall clock with a quiet movement mechanism.', 'HomeStyle', 'piece', '/products/wall-clock.jpg'),
('home-decor', 'Woven Storage Basket', 'Handwoven basket for organising blankets and household items.', 'NaturalNest', 'piece', '/products/storage-basket.jpg'),
('seasonal', 'Decorative Table Centrepiece', 'Seasonal table decoration for celebrations and family gatherings.', 'FestiveGlow', 'piece', '/products/table-centrepiece.jpg'),
('textiles', 'Queen Cotton Sheet Set', 'Breathable cotton sheet set with fitted sheet and pillowcases.', 'SoftNest', 'set', '/products/cotton-sheet-set.jpg'),
('textiles', 'Textured Cushion Covers', 'Pair of removable textured covers for sofa or bed cushions.', 'HomeShade', 'pair', '/products/cushion-covers.jpg'),
('lighting', 'Adjustable Desk Lamp', 'Focused task lamp with an adjustable arm for desks and bedside tables.', 'BrightLine', 'piece', '/products/desk-lamp.jpg'),
('lighting', 'Warm White LED Strip', 'Flexible LED strip lighting for shelves, cabinets and accent spaces.', 'Philips', 'piece', '/products/led-strip.jpg'),
('outdoor', 'Folding Patio Table', 'Weather-resistant folding table for balconies and garden spaces.', 'GardenPro', 'piece', '/products/patio-table.jpg'),
('outdoor', 'Pruning Shears', 'Sturdy garden shears for trimming plants and small branches.', 'AquaFlex', 'piece', '/products/pruning-shears.jpg'),
('pets', 'Padded Cat Scratching Post', 'Stable scratching post with a soft platform for indoor cats.', 'PetComfort', 'piece', '/products/cat-scratching-post.jpg'),
('fitness', 'Resistance Band Set', 'Set of resistance bands for strength and mobility workouts.', 'PowerFit', 'set', '/products/resistance-bands.jpg'),
('fitness', 'Adjustable Weight Bench', 'Compact adjustable bench for home strength training.', 'FitLife', 'piece', '/products/weight-bench.jpg');

INSERT INTO store_products
(store_id, product_id, price, stock_quantity, is_available)
SELECT stores.id, products.id, seed.price, seed.stock_quantity, seed.is_available
FROM (
    SELECT 'BuildRight Hardware - Westlands' AS store_name, 'Two-Seater Loveseat' AS product_name, 24900.00 AS price, 4 AS stock_quantity, TRUE AS is_available
    UNION ALL SELECT 'HomePlus Supplies - Lavington', 'Solid Oak Bookshelf', 18500.00, 3, TRUE
    UNION ALL SELECT 'Urban Home Store - Kilimani', 'Top Load Washing Machine', 38900.00, 2, TRUE
    UNION ALL SELECT 'GreenLife Home & Garden - Karen', 'Digital Microwave Oven', 12900.00, 5, TRUE
    UNION ALL SELECT 'Nairobi Home Market - CBD', '55-inch 4K Smart TV', 74900.00, 2, TRUE
    UNION ALL SELECT 'Cozy Living - Parklands', 'Wireless Bluetooth Speaker', 8500.00, 8, TRUE
    UNION ALL SELECT 'Kitchen Corner - South B', 'Cast Iron Casserole Pot', 6200.00, 6, TRUE
    UNION ALL SELECT 'BrightHouse Electricals - Ngara', 'Glass Food Storage Set', 2800.00, 12, TRUE
    UNION ALL SELECT 'Garden Gate - Runda', 'Round Wall Clock', 3500.00, 5, TRUE
    UNION ALL SELECT 'Family Home Centre - Umoja', 'Woven Storage Basket', 1900.00, 10, TRUE
    UNION ALL SELECT 'Modern Nest - Kileleshwa', 'Decorative Table Centrepiece', 2400.00, 7, TRUE
    UNION ALL SELECT 'Everyday Appliances - Roysambu', 'Queen Cotton Sheet Set', 5400.00, 6, TRUE
    UNION ALL SELECT 'Textile House - Gikomba', 'Textured Cushion Covers', 1600.00, 14, TRUE
    UNION ALL SELECT 'Pet & Home Supplies - Langata', 'Adjustable Desk Lamp', 4300.00, 5, TRUE
    UNION ALL SELECT 'Home Essentials - Embakasi', 'Warm White LED Strip', 2100.00, 9, TRUE
    UNION ALL SELECT 'Outdoor Haven - Ruaka', 'Folding Patio Table', 8900.00, 4, TRUE
    UNION ALL SELECT 'BuildRight Hardware - Westlands', 'Pruning Shears', 1250.00, 16, TRUE
    UNION ALL SELECT 'Pet & Home Supplies - Langata', 'Padded Cat Scratching Post', 5200.00, 3, TRUE
    UNION ALL SELECT 'FitSpace Retail - Kilimani', 'Resistance Band Set', 1800.00, 11, TRUE
    UNION ALL SELECT 'FitSpace Retail - Kilimani', 'Adjustable Weight Bench', 14800.00, 2, TRUE
) AS seed
JOIN stores ON stores.name = seed.store_name
JOIN products ON products.name = seed.product_name;
