const yaml = require('js-yaml');
const fs = require('fs');

// 测试数据 - 包含多触发词的Match对象
const testMatch = {
  id: 'test-match-123',
  type: 'match',
  // triggers数组格式
  triggers: [':aiprd', ':ddd'],
  replace: 'Hello, this is a test with multiple triggers',
  label: '测试多触发词',
  description: '这是一个测试多触发词的示例'
};

// 测试数据 - 包含单个触发词的Match对象
const testSingleMatch = {
  id: 'test-match-456',
  type: 'match',
  trigger: ':hello',
  replace: 'Hello, this is a test with single trigger',
  label: '测试单触发词',
  description: '这是一个测试单触发词的示例'
};

// 创建一个包含两种类型的配置
const testConfig = {
  matches: [
    testMatch,
    testSingleMatch
  ]
};

// 序列化为YAML
const yamlString = yaml.dump(testConfig, {
  indent: 2,
  lineWidth: -1,
  noRefs: true
});

// 输出结果
console.log('序列化后的YAML:');
console.log(yamlString);

// 将结果写入文件
fs.writeFileSync('./test-config.yml', yamlString, 'utf8');
console.log('YAML已保存到test-config.yml');

// 解析回对象并输出
console.log('\n解析回对象:');
const parsedConfig = yaml.load(yamlString);
console.log(JSON.stringify(parsedConfig, null, 2));

// 测试js-yaml如何处理数组的不同格式
console.log('\n测试不同格式的数组:');

// 测试1: 使用数组字面量
const test1 = {
  name: '测试1: 数组字面量',
  values: ['item1', 'item2', 'item3']
};

// 测试2: 使用flow style (compact)
const test2 = {
  name: '测试2: 流式格式',
  values: yaml.dump(['item1', 'item2', 'item3'], { flowLevel: 0 })
};

// 测试3: 使用block style (一行一个)
const test3 = {
  name: '测试3: 块状格式',
  values: yaml.dump(['item1', 'item2', 'item3'], { flowLevel: -1 })
};

// 组合测试
const arrayTests = { tests: [test1, test2, test3] };
const arrayTestsYaml = yaml.dump(arrayTests, {
  indent: 2,
  lineWidth: -1,
  noRefs: true
});

console.log(arrayTestsYaml); 