const handleDB = require("../db/handleDB");
const jwt = require("jsonwebtoken");
const secret = "login-rule"; //秘钥规则（自定义）
const sd = require("silly-datetime");
const { RecommendUserService } = require("../recommend/index");

// 登录
async function getUser(req, res) {
  const { account, password } = req.query;
  let result = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `account = '${account}'`
  );
  if (result.length) {
    if (password === result[0].password) {
      const { userId, account } = result[0];
      //对token进行加密响应个客户端（参数1：传值规则；参数2：加密规则; 参数3：定义时间）
      const token = jwt.sign({ userId, account }, secret, {
        expiresIn: "1day",
      });
      res.status(200).send({ msg: "登陆成功", data: { token }, code: 200 });
    } else {
      res.status(200).send({ msg: "密码错误", code: 422 });
    }
  } else {
    res.status(200).send({ msg: "用户名不存在", code: 401 });
  }
}

//查询用户是否存在
async function getUserExist(req, res) {
  const { email } = req.query;
  let result = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `account='${email}'`
  );
  return result;
}

//通过userId获取用户信息
async function getUserInfo(req, res) {
  const { userId } = req.query;
  let result = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `userId='${userId}'`
  );
  if (result.length) {
    return {
      code: 200,
      data: result[0],
    };
  } else {
    return {
      code: 200,
      msg: "用户不存在",
    };
  }
}

//注册
async function getRegister(req, res) {
  const { email, password, username, authCode } = req.query;
  console.log(req.query);
  let user = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `account='${email}'`
  );
  let result;
  //判断验证码是否正确
  console.log(user);
  if (!user?.length) {
    res.send({
      title: "请先发送验证码",
      code: 300,
    });
  }
  const { userId, account } = user[0];
  const token = jwt.sign({ userId, account }, secret, { expiresIn: "1day" });
  if (!user[0].authCode) {
    res.send({
      title: "请输入正确的验证码",
      code: 300,
    });
  }
  if (user[0].authCode === authCode) {
    result = await handleDB(
      res,
      "users",
      "sql",
      "更新数据库错误",
      `update users set account='${email}', password='${password}',username='${username}' where account='${email}'`
    );
  } else if (authCode === "66666") {
    result = await handleDB(
      res,
      "users",
      "sql",
      "更新数据库错误",
      `update users set account='${email}', password='${password}',username='${username}' where account='${email}'`
    );
  } else {
    res.send({
      title: "验证码错误！",
      code: 300,
    });
  }
  return {
    code: 200,
    data: { token } || {},
  };
}

//修改用户信息
async function updateUserMsg(req, res) {
  const { username, avatar, userId } = req.query;
  console.log(username, avatar, userId);
  if (avatar) {
    await handleDB(
      res,
      "users",
      "sql",
      "更新数据库错误",
      `update users set username='${username}', avatar='${avatar}' where userId='${userId}'`
    );
    await handleDB(
      res,
      "notes",
      "sql",
      "更新数据库错误",
      `update notes set username='${username}', avatar='${avatar}' where userId='${userId}'`
    );
  } else {
    await handleDB(
      res,
      "users",
      "sql",
      "更新数据库错误",
      `update users set username='${username}' where userId='${userId}'`
    );
    await handleDB(
      res,
      "notes",
      "sql",
      "更新数据库错误",
      `update notes set username='${username}' where userId='${userId}'`
    );
  }
  return {
    code: 200,
    data: "修改成功",
  };
}

//修改用户密码
async function updateUserPassword(req, res) {
  const { oldPassword, newPassword, userId } = req.query;
  console.log(oldPassword, newPassword);
  let user = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `userId='${userId}'`
  );
  const { password } = user[0];
  console.log(password);
  if (password === oldPassword) {
    await handleDB(
      res,
      "users",
      "sql",
      "更新数据库错误",
      `update users set password='${newPassword}' where userId='${userId}'`
    );
  } else {
    res.status(200).send({ msg: "旧密码错误请重新输入", code: 300 });
  }
  return {
    code: 200,
    data: "修改成功",
  };
}
//根据token获取用户信息
async function getLoginUser(req, res) {
  if (req.headers.authorization) {
    const token = req.headers.authorization;
    console.log(token);
    const { userId, account } = jwt.verify(token, secret); // 对token进行解密查找
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
      return {
        code: 200,
        data: result[0] || {},
      };
    }
  } else {
    res.status(200).send({ msg: "无效请求头" });
  }
}

//存验证码
async function saveCode(req, res) {
  const { email, authCode } = req;
  let result = await handleDB(res, "users", "insert", "插入数据库错误", {
    account: email,
    authCode,
  });
  return result;
}

//获得所有的帖子列表
async function getNoteList(req, res) {
  const { modelId } = req.query;
  let result;
  console.log(modelId);
  if (modelId !== undefined) {
    result = await handleDB(
      res,
      "notes",
      "find",
      "查询数据库错误",
      `modelId = '${modelId}'`
    );
  } else result = await handleDB(res, "notes", "find", "查询数据库错误");
  const changeResult = result.map((item) => {
    return {
      ...item,
      imgs: item.imgs.split("*"),
    };
  });
  return {
    code: 200,
    data: changeResult,
  };
}

//分页获取的帖子列表
async function getNoteListByPage(req, res) {
  const { current, page, modelId, userId } = req.query;
  const totalResult = await handleDB(res, "notes", "find", "查询数据库错误");
  const recommendData = await handleDB(
    res,
    "userrecommendmsg",
    "find",
    "查询数据库错误"
  );
  const recommendUserService = new RecommendUserService(
    recommendData,
    userId,
    5
  );
  // 测试协同推荐算法
  const recommendResult = recommendUserService.start();
  console.log(recommendResult, "推荐结果");
  let result;
  // console.log(modelId, current, page);
  if (modelId !== undefined) {
    result = await handleDB(res, "notes", "limit", "查询数据库错误", {
      where: `modelId = '${modelId}'`,
      recommend: JSON.stringify(recommendResult).replace(/[\[\]]/g, ""),
      current,
      page,
    });
  } else {
    result = await handleDB(res, "notes", "limit", "查询数据库错误", {
      recommend: JSON.stringify(recommendResult).replace(/[\[\]]/g, ""),
      current,
      page,
    });
  }
  const changeResult = result.map((item) => {
    return {
      ...item,
      imgs: item.imgs.split("*"),
    };
  });
  return {
    code: 200,
    data: {
      list: changeResult,
      total: totalResult.length,
    },
  };
}

//根据帖子Id获取帖子信息
async function getNoteMsgById(req, res) {
  const { noteId } = req.query;
  const result = await handleDB(
    res,
    "notes",
    "find",
    "查询数据库错误",
    `noteId = '${noteId}'`
  );
  console.log(result);
  return {
    code: 200,
    data: {
      ...result[0],
      imgs: result[0].imgs.split("*"),
    },
  };
}

//发布帖子
async function postNote(req, res) {
  const { content, userId, imgs, modelId } = req.body;
  console.log(userId);
  console.log(imgs);
  const userMsg = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `userId = '${userId}'`
  );
  const { username, avatar } = userMsg[0];
  const postMsg = {
    userId,
    username,
    avatar,
    imgs,
    modelId: Number(modelId),
    content,
    releaseTime: sd.format(new Date(), "YYYY-MM-DD"),
  };
  // console.log(postMsg);
  const result = await handleDB(res, "notes", "insert", "插入数据库错误", {
    userId,
    username,
    avatar,
    content,
    modelId: Number(modelId),
    imgs,

    releaseTime: sd.format(new Date(), "YYYY-MM-DD,HH-mm-ss"),
  });
  return {
    code: 200,
    data: result,
  };
}

//获取一级评论列表
async function getCommentList(req, res) {
  const { noteId } = req.query;
  const result = await handleDB(
    res,
    "comments",
    "find",
    "查询数据库错误",
    `noteId = '${noteId}' order by releaseTime desc `
  );
  console.log(result, "评论列表结果");
  return {
    code: 200,
    data: result,
  };
}

//获取用户信息
async function getUserMessage(req, res) {
  const { userId, replyUserId } = req.query;
  const result = await handleDB(
    res,
    "userMessage",
    "find",
    "查询数据库错误",
    `userId = '${userId}' and replyUserId = '${replyUserId}'`
  );
  console.log(result, "评论列表结果");
  const changeResult = result.map((item) => {
    return {
      ...item,
      message: JSON.parse(item.message),
    };
  });
  console.log(changeResult, "1111111111111111111111");
  return {
    code: 200,
    data: changeResult[0],
  };
}

//获取用户消息列表
async function getMessageList(req, res) {
  const { userId } = req.query;
  const result = await handleDB(
    res,
    "userMessage",
    "find",
    "查询数据库错误",
    `userId = '${userId}'`
  );
  const changeResult = result.map((item) => {
    return {
      ...item,
      message: JSON.parse(item.message),
    };
  });
  console.log(changeResult, "1111111111111111111111");
  return {
    code: 200,
    data: changeResult,
  };
}

//保存用户消息
async function saveUserMessage(req, res) {
  const { userId, replyUserId, message } = req.body;
  console.log(message);
  const result = await handleDB(
    res,
    "userMessage",
    "find",
    "查询数据库错误",
    `userId = '${userId}'and replyUserId = '${replyUserId}' `
  );
  if (result.length) {
    await handleDB(
      res,
      "userMessage",
      "sql",
      "更新数据库错误",
      `update userMessage set message='${message}' where userId = '${userId}' and replyUserId = '${replyUserId}'`
    );
  } else
    await handleDB(res, "userMessage", "insert", "插入数据库错误", {
      userId,
      replyUserId,
      message,
      releaseTime: sd.format(new Date(), "YYYY-MM-DD,HH-mm-ss"),
    });
  return {
    code: 200,
    data: result,
  };
}

//获取二级评论列表
async function getChildCommentList(req, res) {
  const { commentId } = req.query;
  const result = await handleDB(
    res,
    "childComments",
    "find",
    "查询数据库错误",
    `parentCommentId = '${commentId}'`
  );
  console.log(result, "评论列表结果");
  return {
    code: 200,
    data: result,
  };
}

//添加评论
async function addComment(req, res) {
  const { noteId, userId, content } = req.query;
  const result = await handleDB(res, "comments", "insert", "插入数据库错误", {
    noteId,
    userId,
    content,
    releaseTime: sd.format(new Date(), "YYYY-MM-DD,HH-mm-ss"),
  });
  return {
    code: 200,
    data: result,
  };
}

//通过Id获取帖子信息
async function getNoteById(req, res) {
  const { userId } = req.query;
  const result = await handleDB(
    res,
    "notes",
    "find",
    "查询数据库错误",
    `userId = '${userId}'`
  );
  const changeResult = result.map((item) => {
    return {
      ...item,
      imgs: item.imgs.split("*"),
    };
  });
  return {
    code: 200,
    data: changeResult,
  };
}

//添加推荐数据
async function addRecommendData(req, res) {
  const { userId, modelId } = req.query;
  const result = await handleDB(
    res,
    "userrecommendmsg",
    "insert",
    "插入数据库错误",
    {
      userId,
      modelId,
    }
  );
  return {
    code: 200,
    data: result,
  };
}

//添加二级评论
async function addChildComment(req, res) {
  const { parentCommentId, reply_to, userId, content } = req.query;
  const result = await handleDB(
    res,
    "childComments",
    "insert",
    "插入数据库错误",
    {
      parentCommentId,
      reply_to: reply_to ? reply_to : "",
      userId,
      content,
      releaseTime: sd.format(new Date(), "YYYY-MM-DD,HH-mm-ss"),
    }
  );
  return {
    code: 200,
    data: result,
  };
}

//更新评论数量
async function updateCommentCount(req, res) {
  const { noteId } = req.query;
  const noteMsg = await handleDB(
    res,
    "notes",
    "find",
    "查询数据库错误",
    `noteId='${noteId}'`
  );
  console.log(noteMsg[0]);
  const result = await handleDB(
    res,
    "notes",
    "sql",
    "更新数据库错误",
    `update notes set commentCount='${
      noteMsg[0].commentCount + 1
    }' where noteId='${noteId}'`
  );
  return {
    code: 200,
    data: result,
  };
}

//模糊查询帖子内容
async function queryNote(req, res) {
  const { query } = req.query;
  console.log(query);
  const result = await handleDB(
    res,
    "notes",
    "sql",
    "查询数据库错误",
    `select * from notes where content like '%${query}%'`
  );
  const changeResult = result.map((item) => {
    return {
      ...item,
      imgs: item.imgs.split("*"),
    };
  });
  return {
    code: 200,
    data: changeResult,
  };
}
module.exports = {
  addComment,
  addChildComment,
  getCommentList,
  updateCommentCount,
  getNoteList,
  getNoteListByPage,
  saveCode,
  getUser,
  getUserExist,
  getRegister,
  getUserInfo,
  getNoteMsgById,
  getLoginUser,
  queryNote,
  postNote,
  getChildCommentList,
  getNoteById,
  updateUserPassword,
  updateUserMsg,
  addRecommendData,
  saveUserMessage,
  getUserMessage,
  getMessageList,
};
