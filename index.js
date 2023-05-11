/*
 * @Description: 接口的编写
 */
const express = require("express");
const upload = require("./multer/upload");
const bodyParser = require("body-parser");
const handleDB = require("./db/handleDB");
const secret = "login-rule"; //秘钥规则（自定义）
const ws = require("nodejs-websocket");
const { SMTPClient } = require("emailjs");
const jwt = require("jsonwebtoken");
const common = require("./utils/common");
const sd = require("silly-datetime");

// 创建express对象
const app = new express();
app.use("/img/", express.static("./public/"));
// 挂载处理post请求的插件
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = app.listen(9999, function () {
  //应用启动端口为8001
  var host = server.address().address;
  var port = server.address().port;
  console.log("访问地址为", host, port);
});

const socketIo = require("socket.io")(server, { cors: true });

let users = [];
//监听connection（用户连接）事件，socket为用户连接的实例
socketIo.on("connection", (socket) => {
  socket.on("disconnect", () => {
    // console.log("用户" + socket.id + "断开连接");
    users = users.filter((item) => item.socketId !== socket.id);
  });

  // 监听客户端连接事件
  socket.on("client_online", (data) => {
    const { nickName, id } = data;
    const userInfo = {
      nickName,
      socketId: socket.id,
      id,
    };
    users.push(userInfo);
    socketIo.emit("server_online", users);
  });

  socket.on("client_msg", (data) => {
    //监听msg事件（这个是自定义的事件）
    // type 1代表左侧消息，2代表右侧消息
    console.log(data);
    const { msg, nickName, roomId, userId } = data;
    const params = {
      msg,
      nickName,
      times: sd.format(new Date(), "YYYY-MM-DD HH:mm:ss"),
      userId,
    };

    const leftMessage = { ...params, type: 1 };
    const rightMessage = { ...params, type: 2 };

    // 向其他人发送消息
    socket.broadcast.emit("server_msg", leftMessage);
    // 向当前发送者返回消息
    socket.emit("server_msg", rightMessage);
  });
});

// 创建emailjs服务
const emailServer = new SMTPClient({
  user: "2200276972@qq.com",
  password: "hjjarvrsihkvdiib",
  host: "smtp.qq.com",
  ssl: true,
});
const {
  RecommendUserService,
} = require("./recommend/index");
const data1 = [
  {
    userId: 1,
    modelId: 1,
  },
  {
    userId: 2,
    modelId: 1,
  },
  {
    userId: 2,
    modelId: 2,
  },
  {
    userId: 3,
    modelId: 2,
  },
  {
    userId: 3,
    modelId: 4,
  },
  {
    userId: 4,
    modelId: 5,
  },
  {
    userId: 4,
    modelId: 6,
  },
  {
    userId: 1,
    modelId: 1,
  },
];
const recommendUserService = new RecommendUserService(data1, 2, 5);

// 测试协同推荐算法
const result = recommendUserService.start();

token = async (req, res, next) => {
  //定义token验证中间件函数（应用于除登录外的每个请求）
  if (req.headers.authorization) {
    const token = req.headers.authorization;
    const { userId, account } = jwt.verify(token, secret); // 对token进行解密查找
    // console.log(userId);
    // console.log(account);
    let result = await handleDB(
      res,
      "users",
      "find",
      "查询数据库错误",
      `userId = '${userId}'`
    );
    // console.log(result);
    if (result.length === 0) {
      res.status(200).send({ msg: "用户错误" });
      return;
    }
    if (account !== result[0].account) {
      res.status(200).send({ msg: "用户错误" });
    } else {
      next();
    }
  } else {
    res.status(200).send({ msg: "无效请求头" });
  }
};

// 随机获取头像背景
function randomRgb() {
  let R = Math.floor(Math.random() * 130 + 110);
  let G = Math.floor(Math.random() * 130 + 110);
  let B = Math.floor(Math.random() * 130 + 110);
  return "rgb(" + R + "," + G + "," + B + ")";
}

//删除所有订单
app.get("/deleteAllOrder", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.deleteAllOrder(req, res).then((result) => {
    res.send(result);
  });
});

//订单详情
app.get("/detail", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getOrder(req, res).then((result) => {
    res.send(result);
  });
});

//登录
app.get("/api/login", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getUser(req, res).then((result) => {
    res.send(result);
  });
});

//注册
app.get("/api/getCode", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  const { email } = req.query;
  common.getUserExist(req, res).then((result) => {
    if (result.length !== 0) {
      res.send({
        title: "该用户已经注册！",
        code: 300,
      });
    } else {
      // 验证码
      const authCode = Math.floor(Math.random() * 100000);
      //发送邮件
      emailServer.send(
        {
          text: `验证码：${authCode}`,
          from: "2200276972@qq.com",
          to: email,
          subject: "欢迎注册民大集市!",
        },
        (err, message) => {
          // if (err) {
          //   res.send({
          //     title: "发送邮件错误",
          //     code: 500,
          //     err,
          //   });
          // } else {
          res.send({
            title: "邮件发送成功，请输入验证码!",
            code: 200,
            authCode,
          });
          common.saveCode({ email, authCode }, res).then((result) => {
            res.send(result);
          });
          return;
          // }
        }
      );
    }
  });
});

//保存用户到数据库
app.post("/api/register", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getRegister(req, res).then((result) => {
    res.send(result);
  });
});

//获取用户信息
app.get("/api/getUserInfo", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getUserInfo(req, res).then((result) => {
    res.send(result);
  });
});

// 上传图片接口
app.post("/api/uploadImage", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  upload(req, res)
    .then((imgsrc) => {
      // 上传成功 存储文件路径 到数据库中
      console.log(imgsrc);
      res.send({
        code: 200,
        data: imgsrc,
      });
      return {
        code: 200,
        data: imgsrc,
      };
    })
    .catch((err) => {
      formatErrorMessage(res, err.error);
    });
});

//通过token获取当前用户登录信息
app.get("/api/getLoginUser", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getLoginUser(req, res).then((result) => {
    res.send(result);
  });
});

//验证token
app.use(token);

// 格式化错误信息
function formatErrorMessage(res, message) {
  res.status(500).send({
    code: "error",
    message: message || "",
  });
}

//获得所有的帖子列表
app.get("/api/getNoteList", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getNoteList(req, res).then((result) => {
    res.send(result);
  });
});
//根据帖子Id获取帖子信息
app.get("/api/getNoteMsgById", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getNoteMsgById(req, res).then((result) => {
    res.send(result);
  });
});
//分页获取的帖子列表
app.get("/api/getNoteListByPage", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getNoteListByPage(req, res).then((result) => {
    res.send(result);
  });
});
          
//发布帖子
app.post("/api/postNote", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.postNote(req, res).then((result) => {
    res.send(result);
  });
});

//获得帖子的评论列表
app.get("/api/getCommentList", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getCommentList(req, res).then((result) => {
    res.send(result);
  });
});

//获得帖子的二级评论
app.get("/api/getChildCommentList", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getChildCommentList(req, res).then((result) => {
    res.send(result);
  });
});

//添加帖子的一级评论
app.get("/api/addComment", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.addComment(req, res).then((result) => {
    res.send(result);
  });
});

//添加帖子的二级评论
app.get("/api/addChildComment", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.addChildComment(req, res).then((result) => {
    res.send(result);
  });
});

//更新帖子的评论数量
app.get("/api/updateCommentCount", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.updateCommentCount(req, res).then((result) => {
    res.send(result);
  });
});

//保存用户聊天消息
app.post("/api/saveUserMessage", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.saveUserMessage(req, res).then((result) => {
    res.send(result);
  });
});

//保存用户聊天消息
app.get("/api/getUserMessage", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getUserMessage(req, res).then((result) => {
    res.send(result);
  });
});

//修改用户信息
app.get("/api/updateUserMsg", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.updateUserMsg(req, res).then((result) => {
    res.send(result);
  });
});

//修改用户密码
app.get("/api/updateUserPassword", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.updateUserPassword(req, res).then((result) => {
    res.send(result);
  });
});

//模糊查询帖子内容
app.get("/api/queryNote", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.queryNote(req, res).then((result) => {
    res.send(result);
  });
});

//根据用户id查询用户帖子
app.get("/api/getNoteById", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getNoteById(req, res).then((result) => {
    res.send(result);
  });
});

//添加推荐数据
app.get("/api/addRecommendData", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.addRecommendData(req, res).then((result) => {
    res.send(result);
  });
});

// 新建订单到数据库
app.post("/addOrder", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.addOrder(req, res).then((result) => {
    res.send(result);
  });
});

//获取单个用户的订单
app.get("/released", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getReleased(req, res).then((result) => {
    res.send(result);
  });
});

//用户接单
app.get("/handleOrder", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.handleOrder(req, res).then((result) => {
    res.send({ code: 200, data: result });
  });
});

//获取用户接单
app.get("/catcher", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.catcher(req, res).then((result) => {
    res.send(result);
  });
});

//用户点击完单，进入验单阶段
app.get("/confirm", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.confirm(req, res).then((result) => {
    res.send(result);
  });
});

//用户确认完单，验单完成
app.get("/confirmSingle", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.confirmSingle(req, res).then((result) => {
    res.send(result);
  });
});

//获取用户关注的对象id
app.get("/getAttention", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getAttention(req, res).then((result) => {
    res.send(result);
  });
});

//修改用户密码
app.get("/amendPass", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.amendPass(req, res).then((result) => {
    res.send(result);
  });
});

//修改用户普通信息
app.get("/amendOrd", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.amendOrd(req, res).then((result) => {
    res.send(result);
  });
});

//获取用户关注的
app.get("/getAtt", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getAtt(req, res).then((result) => {
    res.send(result);
  });
});

//获取关注用户的
app.get("/getAttd", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getAttd(req, res).then((result) => {
    res.send(result);
  });
});

//查询用户是否关注发单者
app.get("/inquireAtt", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.inquireAtt(req, res).then((result) => {
    res.send(result);
  });
});

//模糊查询
app.get("/query", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.query(req, res).then((result) => {
    res.send(result);
  });
});

//关注用户
app.get("/addAttention", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.addAttention(req, res).then((result) => {
    res.send(result);
  });
});

//用户取消关注
app.get("/cancelAtt", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.cancelAtt(req, res).then((result) => {
    res.send(result);
  });
});

//获取用户
app.get("/getUsers", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getUsers(req, res).then((result) => {
    res.send(result);
  });
});

app.listen(8001, () => {
  console.log("正在监听8001端口");
});

// 定义广播函数，给所有用户发送信息
function broadcast(msg) {
  //server.connections: 表示所有的用户
  server.connections.forEach((item) => {
    item.send(JSON.stringify(msg));
  });
}
