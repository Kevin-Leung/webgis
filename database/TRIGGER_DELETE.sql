-- 触发器2：当在 items 表内删除条目时，同步删除 expired 表中的对应条目
CREATE TRIGGER trg_delete_expired
ON items
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- 删除 expired 表中对应的条目
    DELETE FROM expired
    WHERE id IN (SELECT id FROM deleted);
END;