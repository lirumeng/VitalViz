# VitalViz

[项目预览](https://lirumeng.github.io/VitalViz/)

当前仓库已包含一份 `MIMIC-III Clinical Database Demo v1.4` 示例数据，目录位于 `public/data/mimic-iii-clinical-database-demo-1.4`。下面按 CSV 文件逐一说明其内容含义，方便后续做 Vue 3 + D3 图表建模与数据分析。

## 项目启动

```bash
npm install
npm run dev
```

## 数据目录说明

[数据来源](https://physionet.org/content/mimiciii-demo/1.4/)

- 数据目录：`public/data/mimic-iii-clinical-database-demo-1.4`
- 数据性质：MIMIC-III 的演示版临床数据库，包含患者、住院、ICU、医嘱、检验、护理记录等主题表
- 常用关联键：
- `subject_id`：患者 ID
- `hadm_id`：住院 ID，一次住院对应一次 hospital admission
- `icustay_id`：一次 ICU 住院/停留 ID
- `itemid`：项目定义 ID，通常需要关联 `D_ITEMS.csv` 或 `D_LABITEMS.csv`
- `cgid`：护理人员/记录人员 ID，可关联 `CAREGIVERS.csv`

## 各 CSV 文件含义

### ADMISSIONS.csv

- 记录数：129
- 主题：住院主表
- 含义：每一行代表患者的一次住院经历，包含入院时间、出院时间、死亡时间、入院类型、入院来源、出院去向、保险、语言、婚姻、种族、急诊进出时间、主要诊断等信息。
- 关键字段：`subject_id`、`hadm_id`、`admittime`、`dischtime`、`diagnosis`、`hospital_expire_flag`
- 适合分析：住院人次、住院时长、死亡率、入院类型分布、主要诊断分布。

### CALLOUT.csv

- 记录数：77
- 主题：床位/转科呼叫记录
- 含义：记录患者从当前病区向目标病区发起的转运、转床或接收申请，包括申请病区、当前病区、服务科室、隔离需求、申请状态、确认时间和最终结果。
- 关键字段：`subject_id`、`hadm_id`、`curr_careunit`、`callout_service`、`callout_status`、`callout_outcome`
- 适合分析：病区流转效率、呼叫成功率、转科等待时间。

### CAREGIVERS.csv

- 记录数：7567
- 主题：医护/记录人员字典
- 含义：保存护理人员或记录人员的 `cgid` 及其标签、描述，用于解释各类事件表中的记录者身份。
- 关键字段：`cgid`、`label`、`description`
- 适合分析：谁录入了事件数据，或做数据源审计。

### CHARTEVENTS.csv

- 记录数：758355
- 主题：护理观察与床旁监测事件
- 含义：这是 ICU 最核心的大表之一，存储生命体征、评分、呼吸机参数、护理观察等高频时间序列数据。`itemid` 表示测量项目，`value` / `valuenum` 表示记录值。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`itemid`、`charttime`、`value`、`valuenum`
- 适合分析：心率、血压、体温、SpO2 等时序图，异常告警，ICU 过程追踪。

### CPTEVENTS.csv

- 记录数：1579
- 主题：CPT 计费/操作事件
- 含义：记录与 CPT 编码相关的临床服务或收费项目，包括成本中心、日期、CPT 编码、分段标题和描述。
- 关键字段：`subject_id`、`hadm_id`、`chartdate`、`cpt_cd`、`sectionheader`
- 适合分析：操作项目分布、收费项目统计、不同住院的服务类型比较。

### D_CPT.csv

- 记录数：134
- 主题：CPT 编码字典
- 含义：定义 CPT 编码所属大类、小类、编码区间及后缀，可用于解释 `CPTEVENTS.csv` 中的 `cpt_cd`。
- 关键字段：`category`、`sectionrange`、`sectionheader`、`subsectionrange`、`codesuffix`
- 适合分析：把 CPT 事件映射为可读业务类别。

### D_ICD_DIAGNOSES.csv

- 记录数：14567
- 主题：ICD-9 诊断码字典
- 含义：给出诊断编码对应的短标题和长标题，用于解释 `DIAGNOSES_ICD.csv` 中的疾病诊断代码。
- 关键字段：`icd9_code`、`short_title`、`long_title`
- 适合分析：将住院诊断编码翻译成临床可读文本。

### D_ICD_PROCEDURES.csv

- 记录数：3882
- 主题：ICD-9 手术/操作码字典
- 含义：给出操作编码对应的简短名称和详细说明，用于解释 `PROCEDURES_ICD.csv` 中的操作记录。
- 关键字段：`icd9_code`、`short_title`、`long_title`
- 适合分析：把操作编码转换为手术/处置名称。

### D_ITEMS.csv

- 记录数：12487
- 主题：通用项目字典
- 含义：定义大量 ICU 事件项目的 `itemid`，包括名称、缩写、来源系统、所属数据表、类别、单位、参数类型等。`CHARTEVENTS`、`INPUTEVENTS`、`OUTPUTEVENTS`、`DATETIMEEVENTS`、`PROCEDUREEVENTS_MV` 等表通常都要靠它解释项目。
- 关键字段：`itemid`、`label`、`dbsource`、`linksto`、`category`、`unitname`
- 适合分析：把数值事件映射到具体临床指标名称。

### D_LABITEMS.csv

- 记录数：753
- 主题：检验项目字典
- 含义：定义实验室检验项目的 `itemid`，包含检验名称、样本类型、类别、LOINC 编码等，用于解释 `LABEVENTS.csv`。
- 关键字段：`itemid`、`label`、`fluid`、`category`、`loinc_code`
- 适合分析：将实验室检验结果映射为具体指标，如钾、钠、肌酐、血气等。

### DATETIMEEVENTS.csv

- 记录数：15551
- 主题：日期时间型 ICU 事件
- 含义：这张表和 `CHARTEVENTS.csv` 类似，但它存的是“值本身也是日期时间”的事件，例如某项计划时间、设备更换时间、事件发生时间等。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`itemid`、`charttime`、`value`
- 适合分析：临床流程节点、计划与执行时间比较。

### DIAGNOSES_ICD.csv

- 记录数：1761
- 主题：住院诊断明细
- 含义：记录每次住院对应的 ICD-9 诊断编码，`seq_num` 表示诊断顺序，通常 `1` 是主要诊断。
- 关键字段：`subject_id`、`hadm_id`、`seq_num`、`icd9_code`
- 适合分析：主诊断排行、共病结构、疾病谱统计。

### DRGCODES.csv

- 记录数：297
- 主题：DRG 分组信息
- 含义：记录住院对应的 DRG 类型、DRG 编码、描述，以及部分严重度和死亡风险分级。
- 关键字段：`subject_id`、`hadm_id`、`drg_type`、`drg_code`、`description`
- 适合分析：病例组合分组、成本结构、风险分层。

### ICUSTAYS.csv

- 记录数：136
- 主题：ICU 住院主表
- 含义：每一行代表一次 ICU 停留，包含首次/最后病区、病房号、进入 ICU 时间、离开 ICU 时间以及 ICU 停留时长 `los`。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`first_careunit`、`intime`、`outtime`、`los`
- 适合分析：ICU 入住次数、ICU 时长、病区分布、住院与 ICU 关联分析。

### INPUTEVENTS_CV.csv

- 记录数：34799
- 主题：CareVue 系统中的输入事件
- 含义：记录输入到患者体内的液体、营养、药液等项目，来自 CareVue 系统。字段包含输入量、单位、速率、原始剂量、途径等。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`charttime`、`itemid`、`amount`、`rate`
- 适合分析：补液、输注、口服/胃管输入量统计。

### INPUTEVENTS_MV.csv

- 记录数：13224
- 主题：MetaVision 系统中的输入事件
- 含义：与 `INPUTEVENTS_CV.csv` 类似，但来自 MetaVision 系统，字段更丰富，包含开始结束时间、医嘱类别、病人体重、总量、状态说明等。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`starttime`、`endtime`、`itemid`、`amount`、`totalamount`
- 适合分析：输液输血过程、营养支持、给药输入时长。

### LABEVENTS.csv

- 记录数：76074
- 主题：实验室检验结果
- 含义：存储化验结果，如电解质、血常规、生化、血气等。`itemid` 对应 `D_LABITEMS.csv`，`value` 是原始文本值，`valuenum` 是数值型结果。
- 关键字段：`subject_id`、`hadm_id`、`itemid`、`charttime`、`value`、`valuenum`、`flag`
- 适合分析：实验室指标趋势、异常结果检出率、检验与预后关系。

### MICROBIOLOGYEVENTS.csv

- 记录数：2003
- 主题：微生物培养与药敏结果
- 含义：记录送检标本、培养出的菌种、菌落编号、抗生素名称、稀释度和敏感性解释等，是感染分析的重要来源。
- 关键字段：`subject_id`、`hadm_id`、`spec_type_desc`、`org_name`、`ab_name`、`interpretation`
- 适合分析：感染病原谱、血培养阳性率、抗菌药敏感性分布。

### NOTEEVENTS.csv

- 记录数：0
- 主题：临床文本记录
- 含义：这张表用于保存出院小结、护理记录、放射报告等自由文本。当前 demo 数据中只有表头，没有示例记录。
- 关键字段：`subject_id`、`hadm_id`、`category`、`description`、`text`
- 适合分析：在完整 MIMIC 中可做 NLP、病程摘要、文本分类；当前 demo 版无法直接使用。

### OUTPUTEVENTS.csv

- 记录数：11320
- 主题：输出事件
- 含义：记录尿量、引流量、胃液、胸液等从患者体内排出的量化事件，是液体平衡分析的重要数据源。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`charttime`、`itemid`、`value`
- 适合分析：尿量趋势、液体出入平衡、器官功能监测。

### PATIENTS.csv

- 记录数：100
- 主题：患者主表
- 含义：每一行代表一个患者，包含性别、出生时间、死亡时间、院内死亡时间、社保登记死亡时间及死亡标志。
- 关键字段：`subject_id`、`gender`、`dob`、`dod`、`expire_flag`
- 适合分析：患者基础人口学画像、年龄结构、死亡结局。

### PRESCRIPTIONS.csv

- 记录数：10398
- 主题：处方/用药记录
- 含义：记录住院期间的药品医嘱，包括开始结束日期、药品名称、通用名、院内编码、NDC、规格、剂量、给药单位和途径。
- 关键字段：`subject_id`、`hadm_id`、`startdate`、`enddate`、`drug`、`drug_name_generic`、`dose_val_rx`、`route`
- 适合分析：用药频次、抗生素使用、剂量与治疗路径。

### PROCEDUREEVENTS_MV.csv

- 记录数：753
- 主题：MetaVision 系统中的操作事件
- 含义：记录各种 ICU 操作或处置事件，例如置管、拔管、导管留置、特殊设备操作等，并给出位置、类别、持续时间和状态。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`starttime`、`endtime`、`itemid`、`location`
- 适合分析：侵入性操作频次、器械留置时长、流程事件时间线。

### PROCEDURES_ICD.csv

- 记录数：506
- 主题：住院手术/操作编码明细
- 含义：记录某次住院对应的 ICD-9 操作编码，`seq_num` 表示顺序，可关联 `D_ICD_PROCEDURES.csv` 解释具体名称。
- 关键字段：`subject_id`、`hadm_id`、`seq_num`、`icd9_code`
- 适合分析：手术类型分布、住院操作组合、主要操作排行。

### SERVICES.csv

- 记录数：163
- 主题：住院服务科室变更记录
- 含义：记录住院期间所属医疗服务线或科室的变化，例如从普通内科转到外科或其他专科。
- 关键字段：`subject_id`、`hadm_id`、`transfertime`、`prev_service`、`curr_service`
- 适合分析：患者在不同服务线之间的流转路径。

### TRANSFERS.csv

- 记录数：524
- 主题：院内转运/病区转移记录
- 含义：记录患者在院内不同病房、病区、ICU 之间的流转，包括前后 care unit、病房号、进入离开时间及停留时长。
- 关键字段：`subject_id`、`hadm_id`、`icustay_id`、`eventtype`、`prev_careunit`、`curr_careunit`、`intime`、`outtime`
- 适合分析：患者路径图、病区迁移轨迹、住院流程可视化。

## 面向可视化开发的推荐建模方式

- 患者维度：以 `PATIENTS.csv` 为基础，用 `subject_id` 关联住院与检验数据。
- 住院维度：以 `ADMISSIONS.csv` 为核心，用 `hadm_id` 连接诊断、处方、服务变更、DRG、实验室检查。
- ICU 维度：以 `ICUSTAYS.csv` 为核心，用 `icustay_id` 连接监护、输入、输出、操作事件。
- 指标解释：`itemid` 优先关联 `D_ITEMS.csv` 或 `D_LABITEMS.csv`，再做图表展示。
- 时间序列图：优先使用 `CHARTEVENTS.csv`、`LABEVENTS.csv`、`INPUTEVENTS_*`、`OUTPUTEVENTS.csv`。

## 适合直接做的图表主题

- 患者年龄、性别、死亡结局分布
- 住院时长与 ICU 时长分布
- 主要诊断和主要手术排行
- 实验室指标趋势图
- 生命体征时序图
- 输入输出液体平衡图
- 患者院内转运路径图
- 细菌培养与药敏分布图
## 在线访问

- GitHub Pages 地址：`https://lirumeng.github.io/VitalViz/`
- 如果刚完成部署，页面可能会有 1 到 10 分钟延迟，再刷新一次通常就会出现。

## 部署说明

```bash
npm install
npm run build
npm run build:github
```

- GitHub Pages 工作流文件：`.github/workflows/deploy-pages.yml`
- 推送到 `master` 后会自动触发 GitHub Actions 构建并部署
- Vite 在 `github` 模式下会使用 `/VitalViz/` 作为基础路径
- 仓库需要在 `Settings -> Pages -> Build and deployment` 中将 `Source` 设置为 `GitHub Actions`
