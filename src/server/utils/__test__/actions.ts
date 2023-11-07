import {
  getActionGroups,
  getLiveModeActions,
  reconstructActionGroups,
} from '../actions'
import {
  mockActionGroup,
  mockAction,
  mockActionMetadata,
  mockActionAccess,
  mockActionGroupAccess,
  mockActionGroupMetadata,
} from '../../../utils/mockData'
import { Prisma } from '@prisma/client'

const actionGroup = {
  ...mockActionGroup,
  hostInstances: [{ status: 'ONLINE' as const, isInitializing: false }],
  httpHosts: [],
  metadata: {
    ...mockActionGroupMetadata,
    accesses: [],
  },
}

const action = {
  ...mockAction,
  hostInstances: [{ status: 'ONLINE' as const }],
  httpHosts: [],
  schedules: [],
  metadata: {
    ...mockActionMetadata,
    accesses: [],
  },
}

type TestGroups = Record<
  string,
  Prisma.ActionGroupGetPayload<ReturnType<typeof getActionGroups>>
>

type TestActions = Record<
  string,
  Prisma.ActionGetPayload<ReturnType<typeof getLiveModeActions>>
>

describe('reconstructActionGroups', () => {
  const testGroups: TestGroups = {
    video: {
      ...actionGroup,
      slug: 'video',
    },
    videoPurchase: {
      ...actionGroup,
      slug: 'videoPurchase',
    },
    'video/nested': {
      ...actionGroup,
      slug: 'video/nested',
    },

    undefinedAccess: {
      ...actionGroup,
      slug: 'undefinedAccess',
      metadata: {
        ...actionGroup.metadata,
        availability: null,
      },
    },
    orgAcccess: {
      ...actionGroup,
      slug: 'orgAccess',
      metadata: {
        ...actionGroup.metadata,
        availability: 'ORGANIZATION',
      },
    },
    noAccess: {
      ...actionGroup,
      slug: 'noAccess',
      metadata: {
        ...actionGroup.metadata,
        availability: 'GROUPS',
        accesses: [],
      },
    },
    hasAccess: {
      ...actionGroup,
      slug: 'undefinedAccess',
      metadata: {
        ...actionGroup.metadata,
        availability: 'GROUPS',
        accesses: [mockActionGroupAccess],
      },
    },
  }

  const testActions: TestActions = {
    root: { ...action, slug: 'root' },
    'video/video1': { ...action, slug: 'video/video1' },
    'videoPurchase/purchase2': { ...action, slug: 'videoPurchase/purchase2' },

    undefinedAccess: {
      ...action,
      slug: 'undefinedAccess',
      metadata: {
        ...action.metadata,
        availability: null,
      },
    },
    orgAccess: {
      ...action,
      slug: 'orgAccess',
      metadata: {
        ...action.metadata,
        availability: 'ORGANIZATION',
      },
    },
    noAccess: {
      ...action,
      slug: 'noAccess',
      metadata: {
        ...action.metadata,
        availability: 'GROUPS',
        accesses: [],
      },
    },
    hasAccess: {
      ...action,
      slug: 'hasAccess',
      metadata: {
        ...action.metadata,
        availability: 'GROUPS',
        accesses: [mockActionAccess],
      },
    },
  }

  test('returns correct groups without a slugPrefix', () => {
    const { groups, actions, groupBreadcrumbs } = reconstructActionGroups({
      slugPrefix: undefined,
      actionGroups: [
        testGroups['video'],
        testGroups['videoPurchase'],
        testGroups['video/nested'],
      ],
      actions: [testActions['video/video1'], testActions['root']],
      canConfigureActions: true,
      mode: 'live',
    })

    expect(groups.map(g => g.slug)).toEqual(['video', 'videoPurchase'])
    expect(actions.map(a => a.slug)).toEqual(['root'])
    expect(groupBreadcrumbs).toEqual([])
  })

  test("groups don't include groups with common substrings", () => {
    const { groups, actions, groupBreadcrumbs } = reconstructActionGroups({
      slugPrefix: 'video',
      actionGroups: [testGroups['video'], testGroups['videoPurchase']],
      actions: [
        testActions['video/video1'],
        testActions['videoPurchase/purchase2'],
      ],
      canConfigureActions: true,
      mode: 'live',
    })

    expect(groups.map(g => g.slug)).not.toContain(['videoPurchase'])
    expect(actions.map(a => a.slug)).not.toContain(['videoPurchase/purchase2'])
    expect(groupBreadcrumbs).toEqual([testGroups['video']])
  })

  test("breadcrumbs don't include groups with common substrings", () => {
    const { groupBreadcrumbs } = reconstructActionGroups({
      slugPrefix: 'videoPurchase',
      actionGroups: [testGroups['video'], testGroups['videoPurchase']],
      actions: [
        testActions['video/video1'],
        testActions['videoPurchase/purchase2'],
      ],
      canConfigureActions: true,
      mode: 'live',
    })

    expect(groupBreadcrumbs).toEqual([testGroups['videoPurchase']])
  })

  test('breadcrumbs work', () => {
    const { groups, actions, groupBreadcrumbs } = reconstructActionGroups({
      slugPrefix: 'video/nested',
      actionGroups: [
        testGroups['video'],
        testGroups['video/nested'],
        testGroups['videoPurchase'],
      ],
      actions: [
        testActions['video/video1'],
        testActions['videoPurchase/purchase2'],
      ],
      canConfigureActions: true,
      mode: 'live',
    })

    expect(groups).toEqual([])
    expect(actions).toEqual([])
    expect(groupBreadcrumbs).toEqual([
      testGroups['video'],
      testGroups['video/nested'],
    ])
  })

  test('excludes nested action with no access', () => {
    const { groups } = reconstructActionGroups({
      actionGroups: [testGroups['undefinedAccess']],
      actions: [
        {
          ...testActions['undefinedAccess'],
          slug: 'undefinedAccess/undefinedAccess',
        },
        { ...testActions['noAccess'], slug: 'undefinedAccess/noAccess' },
        { ...testActions['hasAccess'], slug: 'undefinedAccess/hasAccess' },
      ],
      canConfigureActions: false,
      mode: 'live',
    })

    const nestedActionSlugs = groups
      .find(g => g.slug === 'undefinedAccess')
      ?.actions.map(a => a.slug)

    expect(groups.map(g => g.slug)).toEqual(['undefinedAccess'])

    expect(nestedActionSlugs).toEqual([
      'undefinedAccess/undefinedAccess',
      'undefinedAccess/hasAccess',
    ])
  })

  test('excludes group with no access', () => {
    const { groups } = reconstructActionGroups({
      actionGroups: [testGroups['noAccess']],
      // group does not contain any actions that explicitly grant access
      actions: [
        { ...testActions['undefinedAccess'], slug: 'noAccess/undefinedAccess' },
        { ...testActions['noAccess'], slug: 'noAccess/noAccess' },
      ],
      canConfigureActions: false,
      mode: 'live',
    })

    expect(groups).toEqual([])
  })

  test('includes parent group with no access if child action includes organization access', () => {
    const { groups } = reconstructActionGroups({
      actionGroups: [testGroups['noAccess']],
      // group does not contain any actions that explicitly grant access
      actions: [
        { ...testActions['undefinedAccess'], slug: 'noAccess/undefinedAccess' },
        { ...testActions['orgAccess'], slug: 'noAccess/orgAccess' },
      ],
      canConfigureActions: false,
      mode: 'live',
    })

    expect(groups.map(g => g.slug)).toEqual(['noAccess'])
  })

  test('includes parent group with no access if child action includes group access', () => {
    const { groups } = reconstructActionGroups({
      // parent group explicitly blocks access
      actionGroups: [testGroups['noAccess']],
      // action explicitly grants access
      actions: [{ ...testActions['hasAccess'], slug: 'noAccess/hasAccess' }],
      canConfigureActions: false,
      mode: 'live',
    })

    const nestedActionSlugs = groups
      .find(g => g.slug === 'noAccess')
      ?.actions.map(a => a.slug)

    // the parent group should be included so the user can access the child action(s).
    expect(groups.map(g => g.slug)).toEqual(['noAccess'])
    expect(nestedActionSlugs).toEqual(['noAccess/hasAccess'])
  })

  test('includes parent group with undefined access if child includes access', () => {
    const { groups } = reconstructActionGroups({
      // parent group explicitly blocks access
      actionGroups: [testGroups['undefinedAccess']],
      // action explicitly grants access
      actions: [
        { ...testActions['hasAccess'], slug: 'undefinedAccess/hasAccess' },
      ],
      canConfigureActions: false,
      mode: 'live',
    })

    const nestedActionSlugs = groups
      .find(g => g.slug === 'undefinedAccess')
      ?.actions.map(a => a.slug)

    // the parent group should be included so the user can access the child action(s).
    expect(groups.map(g => g.slug)).toEqual(['undefinedAccess'])
    expect(nestedActionSlugs).toEqual(['undefinedAccess/hasAccess'])
  })

  test('excludes all groups and actions with undefined access within a top-level group with no access', () => {
    const { groups, actions } = reconstructActionGroups({
      slugPrefix: 'included',
      actionGroups: [
        {
          ...testGroups['noAccess'],
          slug: 'excluded',
        },
        {
          ...testGroups['undefinedAccess'],
          slug: 'excluded/level2',
        },
      ],
      actions: [
        { ...testActions['undefinedAccess'], slug: 'excluded/level2/action' },
      ],
      canConfigureActions: false,
      mode: 'live',
    })

    expect(groups).toEqual([])
    expect(actions).toEqual([])
  })

  test('includes all groups and actions within a top-level group with no access', () => {
    const { groups } = reconstructActionGroups({
      slugPrefix: 'included',
      actionGroups: [
        // top-level group blocks access, but includes a nested child w/ access
        {
          ...testGroups['noAccess'],
          slug: 'included',
        },
        {
          ...testGroups['undefinedAccess'],
          slug: 'included/level2',
        },
      ],
      actions: [
        { ...testActions['hasAccess'], slug: 'included/level2/action' },
      ],
      canConfigureActions: false,
      mode: 'live',
    })

    expect(groups.map(g => g.slug)).toEqual(['included/level2'])
  })
})
