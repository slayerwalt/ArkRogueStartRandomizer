<script setup lang="ts">
import BaseDialog from './BaseDialog.vue';

const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <BaseDialog title="使用说明" @close="emit('close')">
    <div class="usage-guide">
      <p class="guide-intro">先调整干员范围，登记已有的六星。随机开局、随机抽取干员和随机词条挑战都可独立使用。</p>
      <ol class="guide-steps">
        <li>
          <h3>设置干员范围</h3>
          <p>在“干员随机范围”展板点击“调整范围”，按星级、职业或名称查找干员，点击切换参与状态。高亮的干员参与随机，展板会同步显示已选头像和各星级人数。新增干员默认选中，你取消勾选的干员会保持排除，设置会自动保存。</p>
        </li>
        <li>
          <h3>登记已选干员</h3>
          <p>“已选干员”展示已确认的六星。点击“手动添加”，可登记游戏中的应急助力或自己想使用的六星，开局前也可添加。所有随机先按干员范围筛选，再排除这里的干员。</p>
          <p>记录会保留到手动移除；移除后恢复随机资格，6 秒内可以撤销。</p>
          <p>桌面浏览器支持时，可点击“小窗模式”打开置顶头像栏。在小窗中点击“抽取”或“添加”展开操作，再次点击或按 Escape 收起，确认和添加后自动收起；点击头像可移除或撤销。小窗共用主页面的名单、结果和数量设置，关闭小窗会保留当前会话。原页面需保持打开，手机和平板不提供小窗模式。</p>
        </li>
        <li>
          <h3>选择随机开局</h3>
          <p><strong>随心所欲开局：</strong>填入游戏给出的三张招募券，每张券最多抽取三名六星干员，再选一名并“确认开局”，其余干员自行搭配。</p>
          <p><strong>全随机开局：</strong>生成分队、招募组合与开局干员，自动考虑初始希望。也可手选分队和组合，或点击干员重抽，满意后“确认开局”。</p>
          <p>要重新选择开局方式，点击“重置开局”。确认新的开局会追加到名单，保留已有记录。</p>
        </li>
        <li>
          <h3>随机抽取干员</h3>
          <p>无需先随机或确认开局，直接选择实际获得的招募券，从“可选结果”中选一名，再点击“确认招募”。选中状态显示在干员卡片上。抽取遵循随机范围，并排除已选六星和已招募干员；希望是否足够由你判断。</p>
          <p>点击“数量设置”可调整每次抽取的六星、五星总人数，所有招募券共用，默认六星 5 名、五星 0 名。保存后从下次抽取生效，人数不足时显示实际结果；设置会在浏览器中记住，也可恢复默认。</p>
          <p>游戏中自行选择或通过应急助力获得的六星，统一在“已选干员”中手动添加；需要恢复随机资格时，从该展板移除。</p>
        </li>
        <li>
          <h3>随机词条挑战</h3>
          <p>卡片默认折叠，点击标题展开后选择词条池，可同时选择多个难度及仙术杯。每次抽取一条，同局不重复；折叠卡片或调整选池会保留已抽记录。</p>
          <p>词条中的“禁用”“仅限”“要求”由你自行执行。可移除单条或清空列表，移除和清空后有 6 秒可以撤销。</p>
        </li>
      </ol>
      <p class="guide-note">刷新页面会清空开局、本局名单和已抽词条，干员范围和抽取数量设置会保留。</p>
    </div>
    <template #footer>
      <span>之后可从页眉“说明”再次查看。</span>
      <button class="button primary" @click="emit('close')">知道了</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.usage-guide { font-size: 13px; line-height: 1.75; }
.guide-intro { color: var(--muted); }
.guide-steps { display: grid; gap: 18px; margin: 20px 0; padding-left: 22px; }
.guide-steps > li { padding-left: 4px; }
.guide-steps > li::marker { color: var(--primary); font-weight: 600; }
.guide-steps h3 { margin-bottom: 6px; font-size: 15px; }
.guide-steps p + p { margin-top: 6px; }
.guide-steps strong { font-weight: 600; }
.guide-note { padding: 12px 14px; border-radius: var(--radius-small); background: var(--background); color: var(--muted); }
</style>
