const _ = require("lodash");
// 基于用户推荐
const RecommendUserService = class RecommendUserService {
  /**
   * 构造方法
   * @param {*倒查表所有数据组成的数组} data
   * @param {*用户ID} userId
   * @param {*相似度最高的前n个} n
   */
  constructor(data, userId, n) {
    this.data = data;
    this.userId = userId;
    this.n = n;
    // 相似度的分子
    this.top = undefined;
    // 相似度的分母
    this.bottom = undefined;
    // 记录除用户自身外，其他所有用户的ID
    this.userArray = [];
    // 作为中间值，记录当前正在进行的其他用户的模块类别列表
    this.userModelsTemp = [];
    // 记录用户最终相似度列表
    this.similarityList = [];
    // 记录用户相似度前n个用户中所有喜欢的模块类别与本用户不重复的模块类别
    this.targetModels = [];
    // 记录用户对筛选出的各模块类别感兴趣程度
    this.interestedGrade = [];
    // 记录最后的返回结果
    this.result = [];
  }
  /**
   * 入口
   */
  start() {
    // 计算相似度，得出本用户和其他所有用户的相似度分数
    this.getUserArray();
    this.similarityList.sort((a, b) => {
      return b.grade - a.grade;
    });
    // 计算目标模块类别
    this.gettargetModels();
    // 此时目标模块类别已存在this.targetModels中, 然后去重
    this.targetModels = [...new Set(this.targetModels)];

    // 计算用户对每个模块类别的感兴趣程度
    for (let modelId of this.targetModels.values()) {
      this.getInterestedGrade(modelId);
    }
    // 计算最终模块类别列表并逆序排序
    this.getFinalResult();
    console.log(this.result);
    return this.result;
  }
  /**
   * 计算最终模块类别列表并逆序排序
   */
  getFinalResult() {
    this.interestedGrade.sort((a, b) => {
      return b.grade - a.grade;
    });
    for (let obj of this.interestedGrade.values()) {
      this.result.push(obj.modelId);
    }
  }
  /**
   * 计算用户对该模块类别的感兴趣程度
   * @param {*模块类别ID} modelId
   */
  getInterestedGrade(modelId) {
    // 筛选出对模块类别modelId用过行为的用户
    let array = new Set();
    for (let obj of this.data.values()) {
      if (obj.modelId === modelId) {
        array.add(obj.userId);
      }
    }
    //喜欢这个modelId的用户数组
    const users = [...array];
    // 计算感兴趣程度
    let grade = 0;
    for (let userId of users.values()) {
      //取前n个做比较
      for (let i = 0; i < this.n; i++) {
        if (userId === this.similarityList[i].userId) {
          console.log(userId,this.similarityList[i].userId);
          const res = this.getUserSimilarity(
            userId,
            this.similarityList[i].userId
          );
          grade += res;
        }
      }
    }
    // 添加到最终结果
    this.interestedGrade.push({
      modelId: modelId,
      grade: grade,
    });
  }
  /**
   * 获取目标模块类别数组
   */
  gettargetModels() {
    // this.n > this.similarityList.length ? this.n = this.similarityList.l : this.n = this.n
    // 截至目前，以获取用户相似度的逆序排序数组，以下为获取前n个相似用户喜欢的所有模块类别中本用户不喜欢的
    for (let index = 0; index < this.n; index++) {
      const element = this.similarityList[index];
      _.filter(this.data, (obj) => {
        if (obj.userId == element.userId) {
          this.targetModels.push(obj.modelId);
        }
        return obj.userId == element.userId;
      });
    }
    // 去掉自身的模块类别，得到最终目标模块类别数组
    this.duplicateRemovalModels();
  }
  /**
   * 去掉自身的模块类别，得到最终目标模块类别数组
   */
  duplicateRemovalModels() {
    // 获取当前用户买过的模块类别
    const userModels = _.filter(this.data, (obj) => {
      return obj.userId == this.userId;
    });
    // 删除本用户喜欢的模块类别
    for (let obj of userModels.values()) {
      if (this.targetModels.includes(obj.modelId)) {
        this.targetModels.splice(this.targetModels.indexOf(obj.modelId), 1);
      }
    }
  }
  /**
   * 获取除用户自身外其他所有的用户ID
   */
  getUserArray() {
    const data = _.filter(this.data, (obj) => {
      return obj.userId !== this.userId;
    });
    // 获取其他所有用户的ID
    let arrayTemp = [];
    for (let index in data) {
      arrayTemp.push(data[index].userId);
    }
    this.userArray = [...new Set(arrayTemp)];
    // 避免this.n超出边界
    this.n > this.userArray.length
      ? (this.n = this.userArray.length)
      : (this.n = this.n);
    // 遍历计算与每个用户的相似度
    for (let index in this.userArray) {
      this.getUserSimilarity(this.userId, this.userArray[index]);
    }
  }
  /**
   * 计算两个用户的相似度
   * @param {*用户ID} userId
   * @param {*另一个用户ID} otherUserId
   */
  getUserSimilarity(userId, otherUserId) {
    const userSelfModels = _.filter(this.data, (obj) => {
      return userId == obj.userId;
    });
    this.filterUserModels(otherUserId);
    // 计算相似度的分母
    this.bottom = Math.sqrt(userSelfModels.length * this.userModelsTemp.length);
    // 记录模块类别相似的个数
    let count = 0;
    userSelfModels.forEach((ele) => {
      for (let index in this.userModelsTemp) {
        if (ele.modelId == this.userModelsTemp[index].modelId) {
          // 惩罚热门模块类别,计算惩罚参数
          const log = this.filterModelsById(ele.modelId);
          // 可在此处添加weight权重，log * weight
          count += log;
        }
      }
    });
    this.top = count;
    const obj = {
      userId: otherUserId,
      grade: this.top / this.bottom,
    };
    this.similarityList.push(obj);
    return obj.grade;
  }
  /**
   * 过滤出用户otherUserId的模块类别列表
   * @param {用户ID} otherUserId
   */
  filterUserModels(otherUserId) {
    this.userModelsTemp = _.filter(this.data, (obj) => {
      return obj.userId == otherUserId;
    });
  }
  /**
   * 过滤出模块类别modelId的模块类别列表
   * @param {模块类别ID} modelId
   */
  filterModelsById(modelId) {
    const Models = _.filter(this.data, (obj) => {
      return obj.modelId == modelId;
    });
    return 1 / Math.log(1 + Models.length);
  }
};
// 基于物品推荐
const RecommendModelsService = class RecommendModelsService {
  /**
   * 构造方法
   * @param {*倒查表所有数据组成的数组} data
   * @param {*模块类别ID} modelId
   * @param {*用户ID} userId
   * @param {*相似度最高的前k个} k
   */
  constructor(data, userId, k, modelId) {
    this.data = data;
    this.modelId = modelId;
    this.userId = userId;
    // 筛选前k个模块类别······用于模块一······
    this.k = k;
    // 保存待计算模块类别列表······用于模块一······
    this.ModelsList = [];
    // 保存当前模块类别的购买人列表······用于模块一······
    this.users = [];
    // 保存当前模块类别相似度列表······用于模块一······
    this.simpleList = [];
    // 开启第二子系统-模块二
    // 保存当前人喜爱模块类别列表
    this.userPerferList = [];
    // 保存当前人没买过的模块类别列表
    this.ModelsMayPerferList = [];
    // 保存推荐结果并排序
    this.resultRank = [];
    // 最终结果
    this.result = [];
  }

  /**
   * 入口
   */
  start() {
    // 获取待计算数据
    this.getInitialData();
    // 开始计算用户对未买过的模块类别感兴趣程度
    for (let modelId of this.ModelsMayPerferList.values()) {
      const res = this.getUserInterest(modelId);
      this.resultRank.push(res);
    }
    // 逆序排序
    this.resultRank.sort((a, b) => {
      return b.grade - a.grade;
    });
    // 获取最终结果
    this.result = this.resultRank.reduce((array, obj) => {
      array.push(obj.modelId);
      return array;
    }, []);
    return this.result;
  }
  /**
   * 计算用户对该模块类别的感兴趣程度
   * @param {*模块类别ID} modelId
   */
  getUserInterest(modelId) {
    // 获取modelId相似的模块类别列表
    const simple = this.getModelsGrade(false, modelId);
    let grade = 0;
    for (let [index, obj] of simple.entries()) {
      if (this.userPerferList.includes(obj.modelId) && index < this.k) {
        grade += obj.grade;
      }
    }
    return { modelId, grade };
  }
  /**
   * 获取待计算数据
   */
  getInitialData() {
    // 获取当前人的喜爱记录
    this.userPerferList = this.data.reduce((array, obj) => {
      if (obj.userId === this.userId && !array.includes(obj.modelId)) {
        array.push(obj.modelId);
      }
      return array;
    }, []);
    // 获取当前用户没买过的模块类别列表
    this.ModelsMayPerferList = this.data.reduce((array, obj) => {
      if (
        !array.includes(obj.modelId) &&
        !this.userPerferList.includes(obj.modelId)
      ) {
        array.push(obj.modelId);
      }
      return array;
    }, []);
  }
  /**
   * 计算与模块类别modelId相似的前k个模块类别列表,······模块一······
   * @param {*是否去掉自身相关的模块类别} isDelSelf
   * @param {*模块类别ID} modelId
   */
  getModelsGrade(isDelSelf, modelId) {
    this.simpleList = [];
    this.modelId = modelId;
    // 获取待计算模块类别列表
    this.getModelsList();
    // 获取当前模块类别的购买人列表
    this.users = this.getModelsUserNum(this.modelId);
    // 计算相似度
    for (let modelId of this.ModelsList.values()) {
      this.getModelsSimple(modelId);
    }
    // 根据相似度排序
    this.simpleList.sort((a, b) => {
      //倒序
      return b.grade - a.grade;
    });
    // 是否排除掉自身
    if (isDelSelf) {
      this.getNotSelfModels();
    }
    // 相似度归一化
    this.gradeNormalization();
    return this.simpleList;
  }
  /**
   * 获取目标模块类别数组
   */
  getModelsList() {
    //筛选除了本模块类别之外的模块类别数据
    const ModelsArray = this.data.reduce((array, obj) => {
      if (obj.modelId !== this.modelId) {
        array.push(obj.modelId);
      }
      return array;
    }, []);
    //数组去重并解构
    const Models = [...new Set(ModelsArray)];
    // 得到目标模块类别列表
    this.ModelsList = Models;
  }
  /**
   * 去掉已买过的模块类别，得到目标模块类别数组
   */
  getNotSelfModels() {
    // 筛选当前用户买过的模块类别
    const userModels = this.data.reduce((array, obj) => {
      if (obj.userId === this.userId) {
        array.push(obj.modelId);
      }
      return array;
    }, []);
    // 删除本用户买过的模块类别
    for (let [index, obj] of this.simpleList.entries()) {
      if (userModels.includes(obj.modelId)) {
        this.simpleList.splice(index, 1);
      }
    }
  }
  /**
   * 获取模块类别相似度列表
   * @param {模块类别ID} modelId
   */
  getModelsSimple(modelId) {
    const users = this.getModelsUserNum(modelId);
    // 计算相似度的分母
    const bottom = Math.sqrt(this.users.length * users.length);
    let count = 0;
    // 计算两个模块类别的共同用户数，得到相识度的分子
    for (let val of users.values()) {
      if (this.users.includes(val)) {
        // 惩罚活跃用户
        count += this.getSimpleElememt(val);
      }
    }
    // 保存结果对象，包括模块类别ID和相似度
    const res = {
      modelId,
      grade: count / bottom,
    };
    this.simpleList.push(res);
  }
  /**
   * 提升算法，惩罚活跃用户，计算相似度分子
   * @param {*用户ID} userId
   */
  getSimpleElememt(userId) {
    // 找到用户买过的模块类别数量
    const ModelsNum = this.data.reduce((array, obj) => {
      if (obj.userId === userId) {
        array.push(obj.modelId);
      }
      return array;
    }, []);
    const count = [...new Set(ModelsNum)].length;
    const element = 1 / Math.log(1 + count);
    return element;
  }
  /**
   * 获取模块类别的购买人
   * @param {*模块类别ID} modelId
   */
  getModelsUserNum(modelId) {
    //得到模块类别的购买人
    const users = this.data.reduce((array, obj) => {
      if (obj.modelId === modelId) {
        array.push(obj.userId);
      }
      return array;
    }, []);
    return [...new Set(users)];
  }
  /**
   * 相似度归一化
   */
  gradeNormalization() {
    // 取最大值
    const max = this.simpleList[0].grade;
    for (let index of this.simpleList.keys()) {
      this.simpleList[index].grade = this.simpleList[index].grade / max;
    }
  }
};

module.exports = { RecommendUserService, RecommendModelsService };
