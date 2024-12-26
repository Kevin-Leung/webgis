USE iTems
GO

-- ´´½¨ items ±í
CREATE TABLE items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE
);