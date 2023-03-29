/*
 * @Description: 接口的编写
 */
const express = require("express");
const handleDB = require("./db/handleDB");
const secret = "login-rule"; //秘钥规则（自定义）
const ws = require("nodejs-websocket");
const { SMTPClient } = require("emailjs");
const jwt = require("jsonwebtoken");
const common = require("./utils/common");
// 创建emailjs服务
const emailServer = new SMTPClient({
  user: "2200276972@qq.com",
  password: "hjjarvrsihkvdiib",
  host: "smtp.qq.com",
  ssl: true,
});

token = async (req, res, next) => {
  //定义token验证中间件函数（应用于除登录外的每个请求）
  if (req.headers.authorization) {
    const token = req.headers.authorization;
    const { userId, account } = jwt.verify(token, secret); // 对token进行解密查找
    console.log(userId);
    console.log(account);
    let result = await handleDB(
      res,
      "users",
      "find",
      "查询数据库错误",
      `userId = '${userId}'`
    );
    console.log(result);
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

// 创建express对象
const app = new express();

// 随机获取头像背景
function randomRgb() {
  let R = Math.floor(Math.random() * 130 + 110);
  let G = Math.floor(Math.random() * 130 + 110);
  let B = Math.floor(Math.random() * 130 + 110);
  return "rgb(" + R + "," + G + "," + B + ")";
}

//记录用户人数
let num = 0;
//创建websocket连接对象
let server = ws
  .createServer((connect) => {
    let name = "";
    let color = "";
    //当用户发送过来数据，会触发这个函数
    connect.on("text", (data) => {
      data = JSON.parse(data);
      //判断用户进入
      if (data.isEnter) {
        //通知所有人新人进入聊天室
        name = data.nickName;
        //随机生成颜色
        color = randomRgb();
        //用户数加一
        num++;
        broadcast({
          enter: true,
          num,
        });
      } else if (data.level) {
        // 处理用户离开
        num--;
        broadcast({
          level: true,
          num,
        });
      } else {
        broadcast({
          msg: data.msg,
          nickName: name,
          type: data.type,
          color,
        });
      }
    });

    //当发生错误时会触发（包括关闭浏览器）
    connect.on("error", (err) => {
      console.error(err);
    });
  })
  .listen(3001);

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

//验证token
app.use(token);

//通过token获取当前用户登录信息
app.get("/api/getLoginUser", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getLoginUser(req, res).then((result) => {
    res.send(result);
  });
});

//获得所有的帖子列表
app.get("/api/getNoteList", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  common.getNoteList(req, res).then((result) => {
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
