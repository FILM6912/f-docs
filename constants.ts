export const API_TITLE = "Test API - Full CRUD Operations";
export const API_VERSION = "0.1.0";
export const BASE_URL = "https://api.cosmos-store.io/v1";

export const DEFAULT_SPEC = {
  "openapi": "3.1.0",
  "info": {
    "title": "Test API - Full CRUD Operations",
    "version": "0.1.0"
  },
  "paths": {
    "/": {
      "get": {
        "summary": "Read Root",
        "operationId": "read_root__get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        }
      }
    },
    "/users": {
      "get": {
        "tags": [
          "Users"
        ],
        "summary": "Get Users",
        "description": "ดึงรายการ users ทั้งหมด",
        "operationId": "get_users_users_get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "skip",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0,
              "title": "Skip"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "maximum": 100,
              "minimum": 1,
              "default": 10,
              "title": "Limit"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Users"
        ],
        "summary": "Create User",
        "description": "สร้าง user ใหม่",
        "operationId": "create_user_users_post",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/User"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/users/{user_id}": {
      "get": {
        "tags": [
          "Users"
        ],
        "summary": "Get User",
        "description": "ดึงข้อมูล user ตาม ID",
        "operationId": "get_user_users__user_id__get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "user_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "User Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": [
          "Users"
        ],
        "summary": "Update User",
        "description": "อัพเดท user ทั้งหมด (replace)",
        "operationId": "update_user_users__user_id__put",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "user_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "User Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/User"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Users"
        ],
        "summary": "Partial Update User",
        "description": "อัพเดท user บางส่วน",
        "operationId": "partial_update_user_users__user_id__patch",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "user_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "User Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UserUpdate"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Users"
        ],
        "summary": "Delete User",
        "description": "ลบ user",
        "operationId": "delete_user_users__user_id__delete",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "user_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "User Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/products": {
      "get": {
        "tags": [
          "Products"
        ],
        "summary": "Get Products",
        "description": "ดึงรายการ products พร้อม filter",
        "operationId": "get_products_products_get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "skip",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0,
              "title": "Skip"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "maximum": 100,
              "minimum": 1,
              "default": 10,
              "title": "Limit"
            }
          },
          {
            "name": "category",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Category"
            }
          },
          {
            "name": "min_price",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Min Price"
            }
          },
          {
            "name": "max_price",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "number"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Max Price"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Products"
        ],
        "summary": "Create Product",
        "description": "สร้าง product ใหม่",
        "operationId": "create_product_products_post",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Product"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/products/{product_id}": {
      "get": {
        "tags": [
          "Products"
        ],
        "summary": "Get Product",
        "description": "ดึงข้อมูล product ตาม ID",
        "operationId": "get_product_products__product_id__get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "product_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Product Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": [
          "Products"
        ],
        "summary": "Update Product",
        "description": "อัพเดท product ทั้งหมด",
        "operationId": "update_product_products__product_id__put",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "product_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Product Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Product"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "patch": {
        "tags": [
          "Products"
        ],
        "summary": "Partial Update Product",
        "description": "อัพเดท product บางส่วน",
        "operationId": "partial_update_product_products__product_id__patch",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "product_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Product Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ProductUpdate"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Products"
        ],
        "summary": "Delete Product",
        "description": "ลบ product",
        "operationId": "delete_product_products__product_id__delete",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "product_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Product Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/orders": {
      "get": {
        "tags": [
          "Orders"
        ],
        "summary": "Get Orders",
        "description": "ดึงรายการ orders พร้อม filter",
        "operationId": "get_orders_orders_get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "skip",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0,
              "title": "Skip"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "maximum": 100,
              "minimum": 1,
              "default": 10,
              "title": "Limit"
            }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Status"
            }
          },
          {
            "name": "user_id",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "integer"
                },
                {
                  "type": "null"
                }
              ],
              "title": "User Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Orders"
        ],
        "summary": "Create Order",
        "description": "สร้าง order ใหม่",
        "operationId": "create_order_orders_post",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Order"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/orders/{order_id}": {
      "get": {
        "tags": [
          "Orders"
        ],
        "summary": "Get Order",
        "description": "ดึงข้อมูล order ตาม ID",
        "operationId": "get_order_orders__order_id__get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "order_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Order Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Orders"
        ],
        "summary": "Delete Order",
        "description": "ลบ order",
        "operationId": "delete_order_orders__order_id__delete",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "order_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Order Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/orders/{order_id}/status": {
      "patch": {
        "tags": [
          "Orders"
        ],
        "summary": "Update Order Status",
        "description": "อัพเดทสถานะ order",
        "operationId": "update_order_status_orders__order_id__status_patch",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "order_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Order Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Body_update_order_status_orders__order_id__status_patch"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/posts": {
      "get": {
        "tags": [
          "Posts"
        ],
        "summary": "Get Posts",
        "description": "ดึงรายการ posts พร้อม filter",
        "operationId": "get_posts_posts_get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "skip",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "minimum": 0,
              "default": 0,
              "title": "Skip"
            }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": {
              "type": "integer",
              "maximum": 100,
              "minimum": 1,
              "default": 10,
              "title": "Limit"
            }
          },
          {
            "name": "published",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "boolean"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Published"
            }
          },
          {
            "name": "author",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Author"
            }
          },
          {
            "name": "tag",
            "in": "query",
            "required": false,
            "schema": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "null"
                }
              ],
              "title": "Tag"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "post": {
        "tags": [
          "Posts"
        ],
        "summary": "Create Post",
        "description": "สร้าง post ใหม่",
        "operationId": "create_post_posts_post",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Post"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/posts/{post_id}": {
      "get": {
        "tags": [
          "Posts"
        ],
        "summary": "Get Post",
        "description": "ดึงข้อมูล post ตาม ID",
        "operationId": "get_post_posts__post_id__get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "post_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Post Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "put": {
        "tags": [
          "Posts"
        ],
        "summary": "Update Post",
        "description": "อัพเดท post ทั้งหมด",
        "operationId": "update_post_posts__post_id__put",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "post_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Post Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Post"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Posts"
        ],
        "summary": "Delete Post",
        "description": "ลบ post",
        "operationId": "delete_post_posts__post_id__delete",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "post_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Post Id"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/posts/{post_id}/publish": {
      "patch": {
        "tags": [
          "Posts"
        ],
        "summary": "Publish Post",
        "description": "เผยแพร่หรือยกเลิกเผยแพร่ post",
        "operationId": "publish_post_posts__post_id__publish_patch",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "post_id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "integer",
              "title": "Post Id"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Body_publish_post_posts__post_id__publish_patch"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }
    },
    "/echo": {
      "post": {
        "tags": [
          "Utilities"
        ],
        "summary": "Echo Json",
        "description": "ส่ง JSON กลับมาเหมือนเดิม พร้อมข้อมูลเพิ่มเติม",
        "operationId": "echo_json_echo_post",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "additionalProperties": true,
                "type": "object",
                "title": "Data"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        },
        "security": [
          {
            "HTTPBasic": []
          }
        ]
      }
    },
    "/calculate": {
      "post": {
        "tags": [
          "Utilities"
        ],
        "summary": "Calculate",
        "description": "คำนวณทางคณิตศาสตร์",
        "operationId": "calculate_calculate_post",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Body_calculate_calculate_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        },
        "security": [
          {
            "HTTPBasic": []
          }
        ]
      }
    },
    "/upload": {
      "post": {
        "tags": [
          "Files"
        ],
        "summary": "Upload Image",
        "description": "อัพโหลดรูปภาพ",
        "operationId": "upload_image_upload_post",
        "requestBody": {
          "content": {
            "multipart/form-data": {
              "schema": {
                "$ref": "#/components/schemas/Body_upload_image_upload_post"
              }
            }
          },
          "required": true
        },
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        },
        "security": [
          {
            "HTTPBasic": []
          }
        ]
      }
    },
    "/files": {
      "get": {
        "tags": [
          "Files"
        ],
        "summary": "Get All Files",
        "description": "ดึงรายการไฟล์รูปภาพทั้งหมด",
        "operationId": "get_all_files_files_get",
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        },
        "security": [
          {
            "HTTPBasic": []
          }
        ]
      }
    },
    "/files/{filename}": {
      "get": {
        "tags": [
          "Files"
        ],
        "summary": "Get File",
        "description": "ดาวน์โหลดหรือดูรูปภาพ",
        "operationId": "get_file_files__filename__get",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "filename",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Filename"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      },
      "delete": {
        "tags": [
          "Files"
        ],
        "summary": "Delete File",
        "description": "ลบรูปภาพ",
        "operationId": "delete_file_files__filename__delete",
        "security": [
          {
            "HTTPBasic": []
          }
        ],
        "parameters": [
          {
            "name": "filename",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string",
              "title": "Filename"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          },
          "422": {
            "description": "Validation Error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/HTTPValidationError"
                }
              }
            }
          }
        }
      }

    },
    "/stress-test/30-parameters": {
      "get": {
        "tags": [
          "Stress Test"
        ],
        "summary": "UI Stress Test (30 Params)",
        "description": "Endpoint with 30 parameters to test UI layout capabilities.",
        "operationId": "stress_test_30_params",
        "parameters": [
          {"name": "param_01", "in": "query", "schema": {"type": "string"}, "description": "Parameter 01 description."},
          {"name": "param_02", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 02 description."},
          {"name": "param_03", "in": "query", "schema": {"type": "boolean"}, "description": "Parameter 03 description.", "required": true},
          {"name": "param_04", "in": "query", "schema": {"type": "string"}, "description": "Parameter 04 description."},
          {"name": "param_05", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 05 description."},
          {"name": "param_06", "in": "query", "schema": {"type": "string"}, "description": "Parameter 06 with a very long description to test wrapping behavior in the UI table."},
          {"name": "param_07", "in": "query", "schema": {"type": "string"}, "description": "Parameter 07 description."},
          {"name": "param_08", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 08 description."},
          {"name": "param_09_enum", "in": "query", "schema": {"type": "string", "enum": ["on", "off"]}, "description": "Parameter 09 (Enum Test) - Should be a dropdown."},
          {"name": "param_10", "in": "query", "schema": {"type": "string"}, "description": "Parameter 10 description."},
          {"name": "param_11", "in": "query", "schema": {"type": "string"}, "description": "Parameter 11 description."},
          {"name": "param_12", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 12 description."},
          {"name": "param_13", "in": "query", "schema": {"type": "string"}, "description": "Parameter 13 description."},
          {"name": "param_14", "in": "query", "schema": {"type": "boolean"}, "description": "Parameter 14 description."},
          {"name": "param_15", "in": "query", "schema": {"type": "string"}, "description": "Parameter 15 description."},
          {"name": "param_16", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 16 description."},
          {"name": "param_17", "in": "query", "schema": {"type": "string"}, "description": "Parameter 17 description."},
          {"name": "param_18", "in": "query", "schema": {"type": "boolean"}, "description": "Parameter 18 description."},
          {"name": "param_19", "in": "query", "schema": {"type": "string"}, "description": "Parameter 19 description."},
          {"name": "param_20", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 20 description."},
          {"name": "param_21", "in": "query", "schema": {"type": "string"}, "description": "Parameter 21 description."},
          {"name": "param_22", "in": "query", "schema": {"type": "boolean"}, "description": "Parameter 22 description."},
          {"name": "param_23", "in": "query", "schema": {"type": "string"}, "description": "Parameter 23 description."},
          {"name": "param_24", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 24 description."},
          {"name": "param_25", "in": "query", "schema": {"type": "string"}, "description": "Parameter 25 description."},
          {"name": "param_26", "in": "query", "schema": {"type": "boolean"}, "description": "Parameter 26 description."},
          {"name": "param_27", "in": "query", "schema": {"type": "string"}, "description": "Parameter 27 description."},
          {"name": "param_28", "in": "query", "schema": {"type": "integer"}, "description": "Parameter 28 description."},
          {"name": "param_29", "in": "query", "schema": {"type": "string"}, "description": "Parameter 29 description."},
          {"name": "param_30", "in": "query", "schema": {"type": "string"}, "description": "Parameter 30 description."}
        ],
        "responses": {
          "200": {
            "description": "Successful Response",
            "content": {
              "application/json": {
                "schema": {}
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "Body_calculate_calculate_post": {
        "properties": {
          "operation": {
            "type": "string",
            "title": "Operation"
          },
          "a": {
            "type": "number",
            "title": "A"
          },
          "b": {
            "type": "number",
            "title": "B"
          }
        },
        "type": "object",
        "required": [
          "operation",
          "a",
          "b"
        ],
        "title": "Body_calculate_calculate_post"
      },
      "Body_publish_post_posts__post_id__publish_patch": {
        "properties": {
          "published": {
            "type": "boolean",
            "title": "Published"
          }
        },
        "type": "object",
        "required": [
          "published"
        ],
        "title": "Body_publish_post_posts__post_id__publish_patch"
      },
      "Body_update_order_status_orders__order_id__status_patch": {
        "properties": {
          "status": {
            "type": "string",
            "title": "Status"
          }
        },
        "type": "object",
        "required": [
          "status"
        ],
        "title": "Body_update_order_status_orders__order_id__status_patch"
      },
      "Body_upload_image_upload_post": {
        "properties": {
          "file": {
            "type": "string",
            "format": "binary",
            "title": "File"
          }
        },
        "type": "object",
        "required": [
          "file"
        ],
        "title": "Body_upload_image_upload_post"
      },
      "HTTPValidationError": {
        "properties": {
          "detail": {
            "items": {
              "$ref": "#/components/schemas/ValidationError"
            },
            "type": "array",
            "title": "Detail"
          }
        },
        "type": "object",
        "title": "HTTPValidationError"
      },
      "Order": {
        "properties": {
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "user_id": {
            "type": "integer",
            "title": "User Id"
          },
          "product_id": {
            "type": "integer",
            "title": "Product Id"
          },
          "quantity": {
            "type": "integer",
            "title": "Quantity"
          },
          "total_price": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Total Price"
          },
          "status": {
            "type": "string",
            "title": "Status",
            "default": "pending"
          },
          "created_at": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Created At"
          }
        },
        "type": "object",
        "required": [
          "user_id",
          "product_id",
          "quantity"
        ],
        "title": "Order"
      },
      "Post": {
        "properties": {
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "title": {
            "type": "string",
            "title": "Title"
          },
          "content": {
            "type": "string",
            "title": "Content"
          },
          "author": {
            "type": "string",
            "title": "Author"
          },
          "tags": {
            "items": {
              "type": "string"
            },
            "type": "array",
            "title": "Tags",
            "default": []
          },
          "published": {
            "type": "boolean",
            "title": "Published",
            "default": false
          },
          "created_at": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Created At"
          }
        },
        "type": "object",
        "required": [
          "title",
          "content",
          "author"
        ],
        "title": "Post"
      },
      "Product": {
        "properties": {
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "name": {
            "type": "string",
            "title": "Name"
          },
          "description": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Description"
          },
          "price": {
            "type": "number",
            "title": "Price"
          },
          "stock": {
            "type": "integer",
            "title": "Stock",
            "default": 0
          },
          "category": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Category"
          },
          "created_at": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Created At"
          }
        },
        "type": "object",
        "required": [
          "name",
          "price"
        ],
        "title": "Product"
      },
      "ProductUpdate": {
        "properties": {
          "name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Name"
          },
          "description": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Description"
          },
          "price": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "null"
              }
            ],
            "title": "Price"
          },
          "stock": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Stock"
          },
          "category": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Category"
          }
        },
        "type": "object",
        "title": "ProductUpdate"
      },
      "User": {
        "properties": {
          "id": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Id"
          },
          "username": {
            "type": "string",
            "title": "Username"
          },
          "email": {
            "type": "string",
            "title": "Email"
          },
          "full_name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Full Name"
          },
          "age": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Age"
          },
          "is_active": {
            "type": "boolean",
            "title": "Is Active",
            "default": true
          },
          "created_at": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Created At"
          }
        },
        "type": "object",
        "required": [
          "username",
          "email"
        ],
        "title": "User"
      },
      "UserUpdate": {
        "properties": {
          "username": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Username"
          },
          "email": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Email"
          },
          "full_name": {
            "anyOf": [
              {
                "type": "string"
              },
              {
                "type": "null"
              }
            ],
            "title": "Full Name"
          },
          "age": {
            "anyOf": [
              {
                "type": "integer"
              },
              {
                "type": "null"
              }
            ],
            "title": "Age"
          },
          "is_active": {
            "anyOf": [
              {
                "type": "boolean"
              },
              {
                "type": "null"
              }
            ],
            "title": "Is Active"
          }
        },
        "type": "object",
        "title": "UserUpdate"
      },
      "ValidationError": {
        "properties": {
          "loc": {
            "items": {
              "anyOf": [
                {
                  "type": "string"
                },
                {
                  "type": "integer"
                }
              ]
            },
            "type": "array",
            "title": "Location"
          },
          "msg": {
            "type": "string",
            "title": "Message"
          },
          "type": {
            "type": "string",
            "title": "Error Type"
          }
        },
        "type": "object",
        "required": [
          "loc",
          "msg",
          "type"
        ],
        "title": "ValidationError"
      }
    },
    "securitySchemes": {
      "HTTPBasic": {
        "type": "http",
        "scheme": "basic"
      }
    }
  }
};