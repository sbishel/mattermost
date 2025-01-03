CREATE TABLE IF NOT EXISTS PropertyValues (
	ID varchar(26) PRIMARY KEY,
	TargetID varchar(255) NOT NULL,
	TargetType varchar(255) NOT NULL,
	GroupID varchar(26) NOT NULL,
	FieldID varchar(26) NOT NULL,
	Value json,
	CreateAt bigint(20),
	UpdateAt bigint(20),
	DeleteAt bigint(20),
	UNIQUE(GroupID, TargetID, FieldID)
);


SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE table_name = 'PropertyValues'
        AND table_schema = DATABASE()
        AND index_name = 'idx_propertyvalues_targetid_groupid'
    ) > 0,
    'SELECT 1',
    'CREATE INDEX idx_propertyvalues_targetid_groupid ON PropertyValues (TargetID, GroupID);'
));

PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE table_name = 'PropertyValues'
        AND table_schema = DATABASE()
        AND index_name = 'idx_propertyvalues_groupid_targetid'
    ) > 0,
    'SELECT 1',
    'CREATE INDEX idx_propertyvalues_groupid_targetid ON PropertyValues (GroupID, TargetID);'
));

PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;
