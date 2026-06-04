package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Client struct {
	client *minio.Client
	bucket string
	baseURL string
}

func New(endpoint, accessKey, secretKey, bucket string, secure bool) (*Client, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: secure,
	})
	if err != nil {
		return nil, err
	}
	return &Client{
		client:  client,
		bucket:  bucket,
		baseURL: BuildBaseURL(endpoint, bucket, secure),
	}, nil
}

func BuildBaseURL(endpoint, bucket string, secure bool) string {
	protocol := "http"
	if secure {
		protocol = "https"
	}
	return fmt.Sprintf("%s://%s/%s", protocol, strings.TrimPrefix(strings.TrimPrefix(endpoint, "http://"), "https://"), bucket)
}

func (c *Client) BaseURL() string { return c.baseURL }

func (c *Client) Bucket() string { return c.bucket }

func (c *Client) EnsureBucket(ctx context.Context) error {
	exists, err := c.client.BucketExists(ctx, c.bucket)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	return c.client.MakeBucket(ctx, c.bucket, minio.MakeBucketOptions{})
}

func (c *Client) Upload(ctx context.Context, objectName string, reader io.Reader, size int64, contentType string) error {
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err := c.client.PutObject(ctx, c.bucket, objectName, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	return err
}

type Object struct {
	Reader      io.ReadCloser
	Size        int64
	ContentType string
}

func (c *Client) GetObject(ctx context.Context, objectName string) (*Object, error) {
	obj, err := c.client.GetObject(ctx, c.bucket, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	info, err := obj.Stat()
	if err != nil {
		_ = obj.Close()
		return nil, err
	}
	ct := info.ContentType
	if ct == "" {
		ct = "application/octet-stream"
	}
	return &Object{Reader: obj, Size: info.Size, ContentType: ct}, nil
}

func (c *Client) DeleteObject(ctx context.Context, objectName string) error {
	return c.client.RemoveObject(ctx, c.bucket, objectName, minio.RemoveObjectOptions{})
}

// PublicObjectURL builds a direct URL when bucket policy allows public read.
func (c *Client) PublicObjectURL(objectName string) string {
	if strings.HasPrefix(objectName, "http://") || strings.HasPrefix(objectName, "https://") {
		return objectName
	}
	u, err := url.JoinPath(c.baseURL, objectName)
	if err != nil {
		return c.baseURL + "/" + objectName
	}
	return u
}
