const handleDB = require("../db/handleDB");

//获取随机字符串
function getRandomString(n) {
  let str = "";
  while (str.length < n) {
    str += Math.random().toString(36).substr(2);
  }
  return str.substr(str.length - n);
}

//csrf安全保护,设置token
function csrfProtect(req, res, next) {
  let method = req.method;
  if (method == "GET") {
    let csrf_token = getRandomString(48);
    res.cookie("csrf_token", csrf_token);
    next(); //执行跳转到下一个函数执行，即app.use(beforeReq,router)中的下一个
  } else if (method == "POST") {
    // 判断响应头中的x-csrftoken值，和cookies中的csrf_token进行对比
    console.log(req.headers["x-csrftoken"]);
    console.log(req.cookies["csrf_token"]);

    if (req.headers["x-csrftoken"] === req.cookies["csrf_token"]) {
      console.log("csrf验证通过！");
      next();
    } else {
      res.send({ errmsg: "csrf验证不通过!！" });
      return;
    }
  }
}

// 登录
async function getUser(req, res) {
  const { account, password } = req.query;
  let result = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `account = '${account}' && password = '${password}'`
  );
  return result;
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

//获取用户信息
async function getUserInfo(req, res) {
  const { c_id } = req.query;
  return await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `c_id='${c_id}'`
  );
}

//注册
async function getRegister(req, res) {
  const { email, password, username, authCode, userId } = req.query;
  let user = await handleDB(
    res,
    "users",
    "find",
    "查询数据库错误",
    `account='${email}'`
  );
  let result
  //判断验证码是否正确
  if (user[0].authCode !== authCode) {
    res.send({
      title: "验证码错误！",
      code: 300,
    });
  }
  else{
    result = await  handleDB(
        res,
        "users",
        "sql",
        "更新数据库错误",
        `update users set account='${email}', password='${password}',username='${username}' where account='${email}'`
      );
  }
//   let result = await handleDB(res, "users", "insert", "插入数据库错误", {
//     username: username,
//     account: email,
//     password,
//   });
  return result;
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

//获取所有订单信息
async function getOrder(req, res) {
  return await handleDB(res, "orders", "find", "查询数据库错误");
}

//新增订单
async function addOrder(req, res) {
  const form = JSON.parse(req.query.form);
  const {
    title,
    province,
    city,
    commission,
    order_time,
    safety_margin,
    efficiency_margin,
    order_comment,
    order_require,
    common,
    release_time,
    oc_name,
    oc_id,
  } = form;
  const result = await handleDB(res, "orders", "insert", "插入数据库错误", {
    status: 0,
    title,
    province,
    city,
    commission,
    order_time,
    safety_margin,
    efficiency_margin,
    order_comment,
    order_require,
    common,
    release_time,
    oc_name,
    oc_id,
  });
  //更新发单者信息
  handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set total_fund=total_fund-'${commission}' where c_id='${oc_id}'`
  );
  return result;
}

//获取用户的发单
async function getReleased(req, res) {
  const { oc_id } = req.query;
  return await handleDB(
    res,
    "orders",
    "find",
    "查询数据库错误",
    `oc_id='${oc_id}'`
  );
}

//接单
async function handleOrder(req, res) {
  const { c_freeze_fund, c_expendable_fund, total_fund, c_id, o_id } =
    req.query;
  const freeze_fund = c_freeze_fund * 1 + total_fund * 1;
  const expendable_fund = c_expendable_fund - total_fund;
  await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set freeze_fund='${freeze_fund}', expendable_fund='${expendable_fund}' where c_id='${c_id}'`
  );
  await handleDB(
    res,
    "orders",
    "sql",
    "更新数据库错误",
    `update orders set status = '1', c_id='${c_id}' where o_id='${o_id}'`
  );
  return {
    c_freeze_fund: freeze_fund,
    c_expendable_fund: expendable_fund,
  };
}

//获取用户接单量
async function catcher(req, res) {
  const { c_id } = req.query;
  const result = await handleDB(
    res,
    "orders",
    "find",
    "查询数据库错误",
    `c_id='${c_id}'`
  );
  return result;
}

//用户点击完单，更新单子状态
async function confirm(req, res) {
  const { o_id } = req.query;
  const result = await handleDB(
    res,
    "orders",
    "sql",
    "更新数据库错误",
    `update orders set flag = '1' where o_id='${o_id}'`
  );
  return result;
}

//用户确认完单，已经完成验单过程
async function confirmSingle(req, res) {
  const { o_id, c_id, efficiency_margin, safety_margin, commission } =
    req.query;
  const num1 = efficiency_margin * 1 + safety_margin * 1 + commission * 1;
  const num2 = efficiency_margin * 1 + safety_margin * 1;
  const num3 = total_fund * 1;
  //更新订单状态
  const result = await handleDB(
    res,
    "orders",
    "sql",
    "更新数据库错误",
    `update orders set status='${2}', flag='0' where o_id=${o_id}`
  );
  //更新接单者账户
  handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set total_fund=total_fund+'${num3}',freeze_fund=freeze_fund-'${num2}',expendable_fund=expendable_fund+'${num1}' where c_id='${c_id}'`
  );
  return result;
}

//获取用户关注的对象id
async function getAttention(req, res) {
  const { a_id } = req.query;
  const result = await handleDB(
    res,
    "attentions",
    "find",
    "查询数据库错误",
    `a_id='${a_id}'`
  );
  return result;
}

//修改用户密码
async function amendPass(req, res) {
  const { c_id, password, newPass } = req.query;
  const result = await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set password='${newPass}' where c_id='${c_id}' and password='${password}'`
  );
  return result;
}

//修改用户普通信息
async function amendOrd(req, res) {
  const { c_id, name, descript } = req.query;
  const result = await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set name='${name}', descript='${descript}' where c_id='${c_id}'`
  );
  return result;
}

//获取用户关注的
async function getAtt(req, res) {
  const { a_id } = req.query;
  const result = await handleDB(
    res,
    "attentions",
    "sql",
    "查询数据库错误",
    `select * from users join attentions on users.c_id=attentions.ad_id where a_id='${a_id}'`
  );
  return result;
}

//获取关注用户的
async function getAttd(req, res) {
  const { ad_id } = req.query;
  const result = await handleDB(
    res,
    "attentions",
    "sql",
    "查询数据库错误",
    `select * from users join attentions on users.c_id=attentions.a_id where ad_id='${ad_id}'`
  );
  return result;
}

//模糊查询
async function query(req, res) {
  const { query } = req.query;
  const result = await handleDB(
    res,
    "orders",
    "sql",
    "查询数据库错误",
    `select * from orders where title like '%${query}%'`
  );
  return result;
}

//关注用户
async function addAttention(req, res) {
  const { a_id, ad_id } = req.query;
  const result = await handleDB(
    res,
    "attentions",
    "find",
    "查询数据库错误",
    `a_id=${a_id}&&ad_id=${ad_id}`
  );
  if (result.length) {
    return false;
  }
  await handleDB(res, "attentions", "insert", "插入数据库错误", {
    a_id,
    ad_id,
  });
  await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set attention=attention+${1} where c_id='${a_id}'`
  );
  await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set attracting_attention=attracting_attention+${1} where c_id=${ad_id}`
  );
  return true;
}

//用户取消关注
async function cancelAtt(req, res) {
  const { a_id, ad_id } = req.query;
  const result = await handleDB(
    res,
    "attentions",
    "delete",
    "删除数据库错误",
    `a_id=${a_id}&&ad_id=${ad_id}`
  );
  await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set attention='attention-1' where 'c_id=${a_id}'`
  );
  await handleDB(
    res,
    "users",
    "sql",
    "更新数据库错误",
    `update users set attracting_attention=attracting_attention-1 where c_id='${ad_id}'`
  );
  return result;
}

// 查询用户是否关注发单者
async function inquireAtt(req, res) {
  const { a_id, ad_id } = req.query;
  const result = await handleDB(
    res,
    "attentions",
    "find",
    "查询数据库错误",
    `a_id=${a_id}&&ad_id=${ad_id}`
  );
  return result;
}

//获取所有用户
async function getUsers(req, res) {
  const result = await handleDB(res, "users", "find", "查询数据库错误");
  return result;
}

//删除所有订单
async function deleteAllOrder(req, res) {
  const result = await handleDB(res, "orders", "delete", "删除数据库错误");
  return result;
}

module.exports = {
  csrfProtect,
  saveCode,
  getUser,
  getUserExist,
  getRegister,
  getOrder,
  getUserInfo,
  addOrder,
  getReleased,
  handleOrder,
  catcher,
  confirm,
  confirmSingle,
  getAttention,
  amendPass,
  amendOrd,
  getAtt,
  getAttd,
  query,
  addAttention,
  cancelAtt,
  inquireAtt,
  getUsers,
  deleteAllOrder,
};
