-- ������1:��ÿ�β�������ʱ�������ڵ���Ŀ���Ƶ� expired ��
CREATE TRIGGER trg_copy_expired
ON items
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @current_date DATE = GETDATE();

    -- ������ڵ���Ʒ���������ѹ��ڵ�����
    INSERT INTO expired (id, name, location, purchase_date, expiry_date, days_expired)
    SELECT id, name, location, purchase_date, expiry_date,
           DATEDIFF(DAY, expiry_date, @current_date) -- �����ѹ��ڶ�����
    FROM inserted
    WHERE expiry_date < @current_date
      AND NOT EXISTS (SELECT 1 FROM expired WHERE expired.id = inserted.id);
END;
