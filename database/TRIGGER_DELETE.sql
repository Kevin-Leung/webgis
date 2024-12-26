-- ������2������ items ����ɾ����Ŀʱ��ͬ��ɾ�� expired ���еĶ�Ӧ��Ŀ
CREATE TRIGGER trg_delete_expired
ON items
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- ɾ�� expired ���ж�Ӧ����Ŀ
    DELETE FROM expired
    WHERE id IN (SELECT id FROM deleted);
END;