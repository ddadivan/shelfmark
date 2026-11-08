import type { LandingChatMessage } from './landing-chat-message.interface';

/** The five links of the hero chat: five different days, none findable. */
export const LANDING_CHAT_MESSAGES: readonly LandingChatMessage[] = [
  {
    id: 'watch',
    textKey: 'landing.chat.messages.watch.text',
    timeKey: 'landing.chat.messages.watch.time',
    letter: 'Y',
    url: 'youtube.com/watch?v=ng22-signal-forms',
  },
  {
    id: 'coat',
    textKey: 'landing.chat.messages.coat.text',
    timeKey: 'landing.chat.messages.coat.time',
    letter: 'C',
    url: 'cos.com/en/wool-coat-graphite',
  },
  {
    id: 'course',
    textKey: 'landing.chat.messages.course.text',
    timeKey: 'landing.chat.messages.course.time',
    letter: 'S',
    url: 'stepik.org/course/nestjs-for-frontend',
  },
  {
    id: 'ramen',
    textKey: 'landing.chat.messages.ramen.text',
    timeKey: 'landing.chat.messages.ramen.time',
    letter: 'R',
    url: 'seriouseats.com/weeknight-ramen',
  },
  {
    id: 'zoneless',
    textKey: 'landing.chat.messages.zoneless.text',
    timeKey: 'landing.chat.messages.zoneless.time',
    letter: 'A',
    url: 'angular.dev/guide/zoneless',
  },
];
