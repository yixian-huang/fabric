package base

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"strconv"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/crypto/pbkdf2"
)

func checkPassword(hash, password string) bool {
	if hash == "" || password == "" {
		return false
	}
	if strings.HasPrefix(hash, "pbkdf2_sha256$") {
		return checkDjangoPBKDF2Password(hash, password)
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// checkDjangoPBKDF2Password verifies Django's default pbkdf2_sha256 password hashes.
func checkDjangoPBKDF2Password(encoded, password string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 || parts[0] != "pbkdf2_sha256" {
		return false
	}
	iterations, err := strconv.Atoi(parts[1])
	if err != nil || iterations <= 0 {
		return false
	}
	expectedHash, err := base64.StdEncoding.DecodeString(parts[3])
	if err != nil {
		return false
	}
	derived := pbkdf2.Key([]byte(password), []byte(parts[2]), iterations, len(expectedHash), sha256.New)
	return subtle.ConstantTimeCompare(derived, expectedHash) == 1
}
