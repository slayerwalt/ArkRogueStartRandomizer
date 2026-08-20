/**
 * 各星级「常见开局干员」名单。
 *
 * 如何修改：直接增删对应星级数组里的行即可，每行一个干员。
 * 行内用的是干员 id（数据中的唯一标识），后面的注释是干员名，方便对照；
 * 新增时从 src/data/rogue-data.json 里按干员名查到 id 再填入。
 * 名单变化会作为「常见」预设出现在设置中，也是新用户的默认范围。
 */
export const COMMON_OPERATORS: Record<number, string[]> = {
  6: [
    'char_1045_svash2', // 凛御银灰
    'char_4228_closur', // 可露希尔
    'char_4087_ines', // 伊内丝
    'char_1050_chen3', // 赤刃明霄陈
    'char_4182_oblvns', // 丰川祥子
    'char_4064_mlynar', // 玛恩纳
    'char_4145_ulpia', // 乌尔比安
    'char_1043_leizi2', // 司霆惊蛰
    'char_4230_mcnist', // 机械师
    'char_1044_hsgma2', // 斩业星熊
    'char_1048_orchd2', // 焰狐龙梓兰
    'char_1035_wisdel', // 维什戴尔
    'char_2012_typhon', // 提丰
    'char_332_archet', // 空弦
    'char_1046_sbell2', // 圣聆初雪
    'char_4204_mantra', // 真言
    'char_450_necras', // 死芒
    'char_1052_kalts2', // 凯尔希·思衡托
    'char_4202_haruka', // 遥
    'char_1042_phatm2', // 酒神
    'char_206_gnosis', // 灵知
    'char_291_aglina', // 安洁莉娜
    'char_1015_aglna2', // 予愿安洁莉娜
    'char_2027_wang', // 望
    'char_1041_angel2', // 新约能天使
  ],
  5: [
    'char_4199_makiri', // 松桐
    'char_4052_surfer', // 寻澜
    'char_4147_mitm', // 渡桥
    'char_497_ctable', // 晓歌
    'char_401_elysm', // 极境
    'char_102_texas', // 德克萨斯
    'char_4185_amoris', // 祐天寺若麦
    'char_002_amiya', // 阿米娅
    'char_304_zebra', // 暴雨
    'char_4213_skybx', // 天空盒
    'char_1021_kroos2', // 寒芒克洛丝
    'char_4224_turdus', // 乌啾
    'char_171_bldsk', // 华法琳
    'char_128_plosis', // 白面鸮
    'char_4184_dolris', // 三角初华
    'char_4183_mortis', // 若叶睦
    'char_4186_tmoris', // 八幡海铃
    'char_214_kafka', // 卡夫卡
  ],
  4: [
    'char_4208_wintim', // 冬时
    'char_452_bstalk', // 豆苗
    'char_151_myrtle', // 桃金娘
    'char_445_wscoot', // 骋风
    'char_491_humus', // 休谟斯
    'char_4063_quartz', // 石英
    'char_4067_lolxh', // 罗小黑
    'char_196_sunbr', // 古米
    'char_133_mm', // 梅
    'char_328_cammou', // 卡达
    'char_298_susuro', // 苏苏洛
    'char_385_finlpp', // 清流
    'char_484_robrta', // 罗比菈塔
    'char_110_deepcl', // 深海色
    'char_277_sqrrel', // 阿消
    'char_236_rope', // 暗索
    'char_237_gravel', // 砾
  ],
};
