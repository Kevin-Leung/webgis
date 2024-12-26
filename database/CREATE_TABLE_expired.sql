USE iTems
GO
-- ´´½¨ expired ±í
CREATE TABLE expired (
    id INT PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE,
    days_expired INT
);