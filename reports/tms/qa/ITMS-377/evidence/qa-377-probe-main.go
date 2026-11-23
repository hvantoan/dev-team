package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"tms/application/internal/server/grpc/proto"

	"github.com/golang-jwt/jwt/v5"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func main() {
	target := flag.String("target", "127.0.0.1:50051", "grpc target")
	supplier := flag.String("supplier", "", "supplier partner id")
	mode := flag.String("sort", "none", "none|asc|desc")
	prop := flag.String("prop", "date", "sort property name")
	from := flag.String("from", "2020-01-01", "start date")
	to := flag.String("to", "2030-12-31", "end date")
	pageSize := flag.Int("size", 100, "page size")
	flag.Parse()

	secret := os.Getenv("QA_JWT_SECRET")
	tenant := os.Getenv("QA_TENANT_ID")
	user := os.Getenv("QA_USER_ID")
	if secret == "" || tenant == "" || user == "" {
		fmt.Println("missing QA_JWT_SECRET/QA_TENANT_ID/QA_USER_ID")
		os.Exit(2)
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     os.Getenv("QA_REDIS_ADDR"),
		Password: os.Getenv("QA_REDIS_PASSWORD"),
		DB:       1,
	})
	defer rdb.Close()
	perms := os.Getenv("QA_PERMISSIONS")
	if perms == "" {
		perms = "[]"
	}
	isAdmin := os.Getenv("QA_IS_ADMIN") == "true"
	session := fmt.Sprintf(`{"userId":%q,"isAdmin":%t,"permissions":%s}`, user, isAdmin, perms)
	if err := rdb.Set(context.Background(), "auth:token:"+user, session, time.Hour).Err(); err != nil {
		fmt.Println("redis session error:", err)
		os.Exit(2)
	}

	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"tenantId": tenant,
		"userId":   user,
		"iss":      "tms",
		"iat":      time.Now().Unix(),
		"exp":      time.Now().Add(time.Hour).Unix(),
	})
	signed, err := tok.SignedString([]byte(secret))
	if err != nil {
		fmt.Println("sign error:", err)
		os.Exit(2)
	}

	conn, err := grpc.NewClient(*target, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Println("dial error:", err)
		os.Exit(2)
	}
	defer conn.Close()

	cl := proto.NewSupplierDebtServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	ctx = metadata.AppendToOutgoingContext(ctx, "authorization", "Bearer "+signed)

	var sort *proto.Sort
	switch *mode {
	case "asc":
		sort = &proto.Sort{SortPropertyName: *prop, SortDirection: proto.Sort_Ascending}
	case "desc":
		sort = &proto.Sort{SortPropertyName: *prop, SortDirection: proto.Sort_Descending}
	case "none":
		sort = nil
	}

	startT, _ := time.Parse("2006-01-02", *from)
	endT, _ := time.Parse("2006-01-02", *to)

	res, err := cl.History(ctx, &proto.ListSupplierDebtHistoryRequest{
		SupplierId: *supplier,
		Pagination: &proto.Pagination{
			PageIndex: 0,
			PageSize:  int32(*pageSize),
			StartDate: timestamppb.New(startT),
			EndDate:   timestamppb.New(endT),
			Sort:      sort,
		},
	})
	if err != nil {
		fmt.Println("RPC error:", err)
		os.Exit(1)
	}

	fmt.Printf("sort=%s prop=%s total=%d returned=%d\n", *mode, *prop, res.Total, len(res.Items))
	fmt.Println("idx | date                     | document_type    | document_code      | id                         | balance_after")
	for i, it := range res.Items {
		d := ""
		if it.Date != nil {
			d = it.Date.AsTime().UTC().Format("2006-01-02T15:04:05.000000Z")
		}
		fmt.Printf("%3d | %s | %-16s | %-18s | %-26s | %s\n", i+1, d, it.DocumentType, it.DocumentCode, it.Id, it.BalanceAfter)
	}

	asc := true
	descDate := true
	for i := 1; i < len(res.Items); i++ {
		a, b := res.Items[i-1], res.Items[i]
		if lessTuple(b, a) {
			asc = false
		}
		if !lessTuple(a, b) {
			descDate = false
		}
	}
	fmt.Printf("VERDICT asc_by_tuple=%v strictly_desc_by_tuple=%v\n", asc, descDate)
}

func lessTuple(a, b *proto.SupplierDebt) bool {
	at, bt := a.Date.AsTime(), b.Date.AsTime()
	if !at.Equal(bt) {
		return at.Before(bt)
	}
	if a.DocumentType != b.DocumentType {
		return a.DocumentType < b.DocumentType
	}
	if a.DocumentCode != b.DocumentCode {
		return a.DocumentCode < b.DocumentCode
	}
	return a.Id < b.Id
}
