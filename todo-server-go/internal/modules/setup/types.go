package setup

type StatusResponse struct {
	SetupRequired   bool           `json:"setup_required"`
	UserCount       int            `json:"user_count"`
	StorageMode     string         `json:"storage_mode"`
	DatabaseMode    string         `json:"database_mode"`
	RestartRequired bool           `json:"restart_required"`
	Storage         StorageStatus  `json:"storage"`
	Database        DatabaseStatus `json:"database"`
	Bootstrap       BootstrapInfo  `json:"bootstrap"`
}

type StorageStatus struct {
	ModeValue string   `json:"mode"`
	Options   []string `json:"options"`
	Endpoint  string   `json:"endpoint,omitempty"`
	Bucket    string   `json:"bucket,omitempty"`
	LocalPath string   `json:"local_path,omitempty"`
}

type DatabaseStatus struct {
	Mode    string   `json:"mode"`
	Options []string `json:"options"`
	Host    string   `json:"host,omitempty"`
	Name    string   `json:"name,omitempty"`
}

type BootstrapInfo struct {
	Username            string `json:"username"`
	HasDefaultPassword  bool   `json:"has_default_password"`
	DefaultPasswordHint string `json:"default_password_hint"`
}

type CompleteRequest struct {
	AdminPassword        string                  `json:"admin_password"`
	AdminPasswordConfirm string                  `json:"admin_password_confirm"`
	StorageMode          string                  `json:"storage_mode"`
	DatabaseMode         string                  `json:"database_mode"`
	Storage              StorageCompleteRequest  `json:"storage"`
	Database             DatabaseCompleteRequest `json:"database"`
}

type StorageCompleteRequest struct {
	Endpoint  string `json:"endpoint"`
	AccessKey string `json:"access_key"`
	SecretKey string `json:"secret_key"`
	Bucket    string `json:"bucket"`
	Secure    bool   `json:"secure"`
	LocalPath string `json:"local_path"`
}

type DatabaseCompleteRequest struct {
	DSN  string `json:"dsn"`
	Host string `json:"host"`
	Port int    `json:"port"`
	Name string `json:"name"`
	User string `json:"user"`
	Password string `json:"password"`
}

type CompleteResponse struct {
	Message         string `json:"message"`
	RestartRequired bool   `json:"restart_required"`
	SetupURL        string `json:"setup_url"`
}
