import Vue from "vue";
import { Button, Timeline, TimelineItem, Card, Input, Message, Dialog, Tree, Tag, MessageBox } from "element-ui";

Vue.use(Button);
Vue.use(Timeline);
Vue.use(TimelineItem);
Vue.use(Card);
Vue.use(Input);
Vue.use(Dialog);
Vue.use(Tree);
Vue.use(Tag);
Vue.prototype.$message = Message;
Vue.prototype.$messageBox = MessageBox;
