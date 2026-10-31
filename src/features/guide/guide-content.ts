import {
  BicepsFlexed,
  BookA,
  ChartNoAxesColumn,
  ListTodo,
  type LucideIcon,
  Maximize2,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react-native'

/*
 * The guide's chapters, the web app's `src/content/guide` as plain data: the same words, with the
 * web's account, connection and download lines changed to what the phone does (saves on the phone,
 * exports and backups under Your data). Bold runs are marked **like this**.
 */

export type Block =
  | { kind: 'lead'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'steps'; steps: { title: string; text: string }[] }
  | { kind: 'tip'; text: string }
  | { kind: 'facts'; facts: { term: string; text: string }[] }
  | { kind: 'more'; text: string }
  | { kind: 'picture'; name: string; text: string }
  | { kind: 'days' }
  | { kind: 'trends' }

export interface Chapter {
  id: string
  title: string
  part: string
  icon: LucideIcon
  blocks: Block[]
}

export const PARTS = ['In the gym', 'How your numbers work', 'Around the app', 'Reference'] as const

export const CHAPTERS: Chapter[] = [
  {
    id: 'session',
    title: 'A session, start to finish',
    part: 'In the gym',
    icon: BicepsFlexed,
    blocks: [
      { kind: 'lead', text: 'Four steps, and every tap is saved as you go.' },
      {
        kind: 'steps',
        steps: [
          {
            title: 'Start',
            text: 'Today shows the next day in your plan. Tap **Start**, or **Pick session** to train another one.',
          },
          {
            title: 'Log each set',
            text: 'Tap an exercise to open its sets. Each set starts from last time’s numbers. Set them to what you actually did with − and +, then tick it.',
          },
          {
            title: 'Say what was left',
            text: 'After the last set of a weighted lift, pick **Reps left**: how many more you could have done. The report shows how much you had left on average.',
          },
          {
            title: 'Finish and rate',
            text: 'Tap **Finish workout** and rate it **Easy**, **OK**, **Hard** or **Too much**. The summary shows any new bests.',
          },
        ],
      },
      {
        kind: 'tip',
        text: 'Rate every session honestly. The next session says when the last one was **Too much**, and the deload note on Stats reads your ratings.',
      },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Every tap saves',
            text: 'On the phone, at once. You can close the app between sets and come back to the session.',
          },
          {
            term: 'Screen stays on',
            text: 'While a session runs. To let it sleep, change **Screen during a session** in Settings.',
          },
          {
            term: 'One more set',
            text: '**Add a set** and **Remove the last set** change today only. The plan stays as it is.',
          },
          {
            term: 'Machine taken',
            text: '**Swap** under a lift’s sets puts another lift in its place today: one of its alternates, or anything in the library, with its own last time and range. Sets already ticked stay. Tick **Also on the plan** to keep the swap.',
          },
          {
            term: 'How long',
            text: 'The top counts the minutes since the start. **Pause** stops the count, for a chat or a queue, and the paused time stays out of the session’s minutes.',
          },
          {
            term: 'Wrong day',
            text: '**Change session** under Session options switches day, but drops the sets logged so far. **Discard workout** throws the session away.',
          },
          {
            term: 'Skipped a day',
            text: '**Skip or done** on Today asks, then moves on to the day after, with nothing logged. Rolling order only: by weekday, the calendar decides.',
          },
          {
            term: 'Trained without the app',
            text: 'On Stats, tap the day on the calendar and pick which plan day it was. Its sets open with last time’s numbers: tick what you did, or **Tick all** for a session that went as planned, then log it.',
          },
        ],
      },
      {
        kind: 'picture',
        name: 'Barbell Bench Press',
        text: 'Every exercise has pictures like these. In the app, tap a lift’s picture to see how to do it and the muscles it works.',
      },
    ],
  },
  {
    id: 'zen',
    title: 'Zen mode',
    part: 'In the gym',
    icon: Maximize2,
    blocks: [
      { kind: 'lead', text: 'One set at a time, big enough to read from the bench.' },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Open it',
            text: 'The square button with a target in it, next to the three dots at the top of a session.',
          },
          { term: 'What you see', text: 'Big numbers, wide − and + buttons, and one big button to mark the set done.' },
          { term: 'Fix a set', text: 'Tap **Undo** under the done button to open the last set again.' },
          {
            term: 'Next lift',
            text: 'The arrows at the bottom move between lifts; the strip at the top shows where you are.',
          },
        ],
      },
    ],
  },
  {
    id: 'targets',
    title: 'Your numbers',
    part: 'How your numbers work',
    icon: TrendingUp,
    blocks: [
      {
        kind: 'lead',
        text: 'Each lift shows its rep range, what you did last time, and a plain fact or two. What to lift today is your call.',
      },
      {
        kind: 'text',
        text: 'Every set starts from last time’s numbers. Tick it as it is to log the same again, or change it first with − and +.',
      },
      {
        kind: 'text',
        text: 'One well-known way to move up is double progression: add reps until every set reaches the top of the range, then add weight and start again from the bottom.',
      },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Last time',
            text: 'The line under a lift’s name repeats its newest session, whichever plan day it was on: “Last time 60 kg × 8, 8, 7.”',
          },
          {
            term: 'Top of the range',
            text: 'Every set reached the top of the range last time. When the next weight up is more than 10% heavier, the line says how much: “The next step, 10 kg, is 100% more.” A jump that big is often better taken as more reps first, or with smaller plates.',
          },
          {
            term: 'Same weight',
            text: 'Three or more sessions in a row at one weight. “Reps climbing” means the reps went up along the way.',
          },
          { term: 'Rated too much', text: 'You rated the last session **Too much**.' },
          {
            term: 'Plateaus are normal',
            text: 'Progress slows the longer you train, and weeks at one weight are part of it. More reps, smaller steps, a lighter week or an alternate lift all keep a lift going.',
          },
          {
            term: 'Lighter weeks',
            text: 'A deload, fewer sets at the same weights for a week, lets tiredness clear. Coaches plan them, or take them when training feels heavy. Stats says when two hard weeks meet most lifts holding.',
          },
          {
            term: 'Weight steps',
            text: 'A barbell takes one plate on each side, so it steps by twice your **Bar plates**: 5 kg with 2.5 kg plates, 2.5 kg with 1.25 kg. Machines you load with plates, like the leg press, hack squat and Smith machine, step the same way. Dumbbells step by your **Dumbbells** gap, cables and pin machines by your **Machine stack**. The − and + buttons move by these steps.',
          },
          {
            term: 'Smallest steps',
            text: 'Set them in Settings under Units. All three start at 2.5 kg (2.5, 5 and 5 lb). Tick **Same for all** to use one value everywhere.',
          },
          {
            term: 'Empty bar',
            text: 'A barbell weight is the whole bar, plates and all: an Olympic bar is 20 kg (45 lb). A barbell lift’s first session starts there. Curls and triceps work start blank: they go on lighter EZ or fixed bars.',
          },
          {
            term: 'First year',
            text: 'While **Training age** in Settings is **Under a year**, each lift is capped at 3 sets a session. Plan shows the capped number.',
          },
          {
            term: '+1 set',
            text: 'With a year or more, a lift that is going well offers **+1 set to plan** on its card in a session. Tap it to train that lift with one more set from now on.',
          },
        ],
      },
      {
        kind: 'more',
        text: 'Going well means trained at least twice in the last two weeks, every set reached the bottom of its range, every one of those sessions rated and none of them Too much, and performance has not clearly declined. Once three weeks of history exist, the latest performance must also be improving. A lift gains at most one set a week, up to 6. The guide to load steps: the ACSM’s position stand raises the load 2–10% once you beat your target by a rep or two, the lower end for small muscles.',
      },
    ],
  },
  {
    id: 'alerts',
    title: 'Alerts and deloads',
    part: 'How your numbers work',
    icon: TriangleAlert,
    blocks: [
      {
        kind: 'lead',
        text: 'The app says when a lift or the scale has held for a while, once, and leaves the next move to you.',
      },
      {
        kind: 'facts',
        facts: [
          {
            term: 'One at a time',
            text: 'Alerts show as a card you swipe through, so a handful never crowd out the session. Each card carries its own action, see the report, go to Plan, see your weight, and a × to clear it once it is dealt with.',
          },
          {
            term: 'Lift stopped moving',
            text: 'Today tells you the week it starts, with the usual ways past a plateau.',
          },
          { term: 'Scale stays flat', text: 'Today tells you once, when the flat run starts.' },
          {
            term: 'Under its range',
            text: 'A bodyweight lift under its rep range for three sessions names its alternate on Plan.',
          },
          {
            term: 'Deload week',
            text: 'After two hard weeks with most lifts holding, Stats says so, and that a lighter week is part of training. Cutting sets is up to you. **Drop the extra sets** on that card takes back any +1 sets.',
          },
        ],
      },
      {
        kind: 'more',
        text: 'Two hard weeks: each of the last two weeks averaged Hard or worse, counting Easy as 1, OK as 2, Hard as 3 and Too much as 4. Most lifts holding: 3 in every 4 comparable lifts had no completed-set performance improvement in the last two weeks, with a baseline in the preceding two weeks. Stall alerts require three sessions in four weeks without an improvement and an older baseline. The Lifts chips compare the latest session with the previous one.',
      },
    ],
  },
  {
    id: 'plan',
    title: 'Your plan',
    part: 'Around the app',
    icon: ListTodo,
    blocks: [
      { kind: 'lead', text: 'Your plan is yours to change: every day, every exercise.' },
      {
        kind: 'text',
        text: 'Each day wears a plate colour and a symbol. Red days push, blue days pull, yellow days train legs, and grey covers the rest.',
      },
      { kind: 'days' },
      {
        kind: 'text',
        text: 'The lifts a split starts with are not random. Each template follows a well-known program, named under it in the picker: the Reddit PPL, Jeff Nippard’s PPL + Upper / Lower, Brandon Campbell’s PHUL, the classic Upper / Lower, full-body and bodybuilding splits, and Arnold’s. They keep what the research on muscle growth agrees on: every muscle twice a week on four days or more, the big compound lifts first, and 10 to 20 hard sets a week on the big muscles. Prefer your own lifts? Tick **Start with empty days** when you pick a split and fill each day in here.',
      },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Edit an exercise',
            text: 'Tap it to change its name, sets, reps or type, or swap in one of its alternates. A lift the library knows comes with the sets and range it is usually done for, on a swap and when you pick it from the library; change them if your plan says otherwise.',
          },
          {
            term: 'Add and arrange',
            text: '**Add exercise** adds one, up to ten a day. Drag a lift by its grip to reorder the day; **Restore default order** in the day’s menu puts it back. **Add a day** adds a day, and each day’s menu renames, moves or removes it.',
          },
          {
            term: 'Your own file',
            text: '**Bring your own plan** loads a plan from Excel or CSV. **Download template** gives you a file to fill in, starting from your current plan or any split. A day is its rows in the sheet, so a day with no lifts does not travel through the file.',
          },
          {
            term: 'Empty days',
            text: 'A day with no lifts shows **Add lifts on Plan** on Today instead of Start. Removing the last lift of a day leaves it that way until you add one.',
          },
          {
            term: 'Start over',
            text: '**Reset to the original plan** undoes your edits to a built-in split, and brings its lifts back to days you started empty.',
          },
          {
            term: 'Change split',
            text: 'In Settings. Each split keeps its own plan, so going back brings your edits back. **Start with empty days** gives the picked split, or the one you are on, its days with no lifts in place of that plan.',
          },
        ],
      },
    ],
  },
  {
    id: 'stats',
    title: 'Stats',
    part: 'Around the app',
    icon: ChartNoAxesColumn,
    blocks: [
      { kind: 'lead', text: 'Three tabs: your lifts, your sessions and your body.' },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Lifts',
            text: 'Pick a lift to see its best set each week: the one with the highest estimated one-rep max, which counts weight and reps together.',
          },
          {
            term: 'Sessions',
            text: 'The week’s totals, a calendar and a body map of hard sets per muscle. Tap a day to fix or delete its session, or an earlier day with none to log the session you did without the app.',
          },
          { term: 'Body', text: 'Bodyweight and tape on charts. Log either for today or a day you missed.' },
        ],
      },
      { kind: 'text', text: 'Chips on the Lifts tab filter your lifts by trend:' },
      { kind: 'trends' },
      {
        kind: 'text',
        text: 'Trends compare the latest two finished sessions across the same number of completed sets. More reps at the same weight count, even when the best set stays the same. Adding sets alone does not change the trend. Across different weights, estimated performance is compared; holds use seconds. Bodyweight work uses reps, including bodyweight when both sessions have a weigh-in. These describe logged performance, not measured strength. Best-set charts and personal records remain separate. **Idle** means more than 14 days without a session. **New** means fewer than two comparable sessions, including after a logging-mode change. The same named lift in the same logging mode has one combined history across plan days and imported IDs.',
      },
      {
        kind: 'text',
        text: '**Report**, in the menu, is the look back: a finished week or month next to the one before. Today links to it for two days after a week or a month ends.',
      },
      {
        kind: 'facts',
        facts: [
          {
            term: 'The numbers',
            text: 'Sessions against your plan, hard sets, new bests and bodyweight, each against the period before.',
          },
          {
            term: 'Needs attention',
            text: 'Muscles clearly under the hard sets your plan asks for (less than nine in ten), lifts holding or slipping, sessions rated **Too much**, and two hard weeks with most lifts holding. Shown only when there is something.',
          },
          { term: 'Went well', text: 'New bests in the period, and lifts whose best set beat the period before.' },
          {
            term: 'Share',
            text: '**Share** at the bottom of the report makes a card of the week: your days, the sessions, and one highlight you pick, a new best, how many, the streak, every session done, or nothing. Bodyweight stays off it unless you tick it.',
          },
          {
            term: 'Finished periods only',
            text: 'The week or month still running is never reported on. A week needs one session, a month three. The arrows reach back a year.',
          },
        ],
      },
    ],
  },
  {
    id: 'body',
    title: 'Weigh-ins and tape',
    part: 'Around the app',
    icon: Ruler,
    blocks: [
      { kind: 'lead', text: 'A check-in for the scale and the tape, without the nagging.' },
      {
        kind: 'facts',
        facts: [
          { term: 'Weigh-in', text: 'Today asks every 7 days.' },
          { term: 'Tape', text: 'Today asks every 28 days: arm, chest and waist.' },
          {
            term: 'Where to log',
            text: 'From Today, or from Stats under Body. Missed a day? Step the day back on the dialog.',
          },
          {
            term: 'Not now',
            text: 'Quiets a reminder. It waits longer each time you wave it away, but always comes back.',
          },
        ],
      },
      {
        kind: 'text',
        text: '**How to measure.** The tape only tells you something when every entry is taken the same way. Same side, same time of day, before training, tape snug but not digging in.',
      },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Arm',
            text: 'Bend the arm and flex. Wrap the tape around the peak of the upper arm, straight across, not on a slant. Always the same arm.',
          },
          {
            term: 'Chest',
            text: 'Arms down, tape under the armpits around the fullest part. Breathe out normally, then read it.',
          },
          { term: 'Waist', text: 'At the navel. Belly relaxed, not pulled in, after breathing out.' },
        ],
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings worth a look',
    part: 'Around the app',
    icon: SlidersHorizontal,
    blocks: [
      { kind: 'lead', text: 'You set most of these during setup. A few are worth a second look.' },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Schedule',
            text: '**Rolling** runs the days in order whenever you train. **By weekday** ties each day to a weekday you pick on Plan. Today then shows today’s day or a rest day.',
          },
          {
            term: 'Training age',
            text: '**Under a year** or **A year or more**. It does not count up on its own, so change it once you pass a year.',
          },
          { term: 'Bodyweight goal', text: 'Gain, hold or cut. Today reads the scale against it.' },
          { term: 'Look', text: 'The app’s colours, under **Look** in the menu.' },
        ],
      },
    ],
  },
  {
    id: 'data',
    title: 'Your data',
    part: 'Around the app',
    icon: ShieldCheck,
    blocks: [
      { kind: 'lead', text: 'Your logbook stays on your phone. Take it with you any time.' },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Everything at once',
            text: '**Backup** in Settings under Your data makes one file of everything: your settings, every plan, every session, weigh-in and measurement. Share it, save it to a folder, or send it to yourself.',
          },
          {
            term: 'Your logs',
            text: '**Export** on Stats under Sessions, or in Your data: every set with its session’s rating and note, every weigh-in and every measurement, as Excel or CSV. Two layouts: **Log**, one row per set, for sorting and charts; **Tracker**, a sheet per plan day with the sets across, like a paper logbook (Excel only).',
          },
          {
            term: 'Bring it back',
            text: '**Restore** in Your data loads a backup file, and **Import** loads logs from Excel or CSV, with a preview first.',
          },
          {
            term: 'Snapshots',
            text: 'The app keeps a backup of its own every week and keeps the last eight, so a lost phone is not a lost logbook when they are mirrored to a folder.',
          },
          {
            term: 'Delete everything',
            text: 'In Settings. Removes your plan and training history after a typed confirmation. The dialog offers a backup first.',
          },
        ],
      },
    ],
  },
  {
    id: 'words',
    title: 'Words we use',
    part: 'Reference',
    icon: BookA,
    blocks: [
      { kind: 'lead', text: 'New to lifting? These are the words the app uses.' },
      {
        kind: 'facts',
        facts: [
          {
            term: 'Rep and set',
            text: 'A rep is one lift of the weight. A set is reps in a row before a rest. 3 × 8 means 3 sets of 8 reps.',
          },
          { term: '60 kg × 8', text: '8 reps at 60 kg.' },
          {
            term: 'Rep range',
            text: 'The reps to aim for in each set, like 8–12. Each exercise has one, set as Low and High on Plan.',
          },
          { term: 'Last time', text: 'The numbers a set starts from: what you did in the lift’s newest session.' },
          {
            term: 'Split',
            text: 'How training is divided into days. Push / Pull / Legs and Upper / Lower are splits.',
          },
          {
            term: 'Push, pull, legs',
            text: 'Push days train chest, shoulders and triceps. Pull days train back, rear shoulders and biceps. Legs days train thighs, hips and calves.',
          },
          { term: 'Upper, lower, full', text: 'The upper half, the legs and hips, or everything in one day.' },
          {
            term: 'Weighted lift',
            text: 'A lift with a bar, dumbbells or a machine. A bodyweight lift is you lifting yourself, as in a pull-up.',
          },
          { term: 'Alternate', text: 'A swap an exercise keeps ready, for when the machine is taken.' },
          { term: 'Plate', text: 'A weight disc that slides onto a bar.' },
          { term: 'Hard set', text: 'A set you ticked done. Stats counts them per muscle each week.' },
          {
            term: 'One-rep max',
            text: 'The most you could lift once. The app estimates it from weight and reps to compare sets.',
          },
          {
            term: 'Deload',
            text: 'A lighter week to recover, with fewer sets at the same weights. A normal part of training.',
          },
          { term: 'Plateau', text: 'Weeks at one weight. Normal, and more so the longer you train.' },
          { term: 'Training age', text: 'How long you have trained, set in Settings.' },
          { term: 'Gain, hold, cut', text: 'Your bodyweight goal: put weight on, keep it, or lose it.' },
          { term: 'Tape', text: 'Body measurements with a tape measure, at the arm, chest and waist.' },
        ],
      },
    ],
  },
]

export const chapterById = (id: string): Chapter | undefined => CHAPTERS.find((c) => c.id === id)
