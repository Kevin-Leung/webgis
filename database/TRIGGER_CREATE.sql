-- 触发器1:在每次插入或更新时，将过期的条目复制到 expired 表
CREATE TRIGGER trg_copy_expired
ON items
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @current_date DATE = GETDATE();

    -- 插入过期的物品，并计算已过期的天数
    INSERT INTO expired (id, name, location, purchase_date, expiry_date, days_expired)
    SELECT id, name, location, purchase_date, expiry_date,
           DATEDIFF(DAY, expiry_date, @current_date) -- 计算已过期多少天
    FROM inserted
    WHERE expiry_date < @current_date
      AND NOT EXISTS (SELECT 1 FROM expired WHERE expired.id = inserted.id);
END;
