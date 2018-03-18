/* eslint-disable no-shadow */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  FlatList,
  KeyboardAvoidingView,
  Keyboard,
  Linking,
  Platform,
} from 'react-native';
import { Icon } from 'react-native-elements';
import ActionSheet from 'react-native-actionsheet';
import { withI18n } from '@lingui/react';

import {
  ViewContainer,
  LoadingContainer,
  IssueDescription,
  CommentListItem,
  CommentInput,
  IssueEventListItem,
} from 'components';
import { v3 } from 'api';
import { formatEventsToRender, openURLInView } from 'utils';
import { colors } from 'config';
import { getRepository, getContributors } from 'repository';
import {
  getIssueComments,
  postIssueComment,
  getIssueFromUrl,
  deleteIssueComment,
  getIssueEvents,
} from '../issue.action';

const mapStateToProps = state => ({
  authUser: state.auth.user,
  repository: state.repository.repository,
  contributors: state.repository.contributors,
  issue: state.issue.issue,
  diff: state.issue.diff,
  pr: state.issue.pr,
  isMerged: state.issue.isMerged,
  comments: state.issue.comments,
  events: state.issue.events,
  isPendingDiff: state.issue.isPendingDiff,
  isPendingCheckMerge: state.issue.isPendingCheckMerge,
  isPendingComments: state.issue.isPendingComments,
  isPendingEvents: state.issue.isPendingEvents,
  isPostingComment: state.issue.isPostingComment,
  isPendingContributors: state.repository.isPendingContributors,
  isDeletingComment: state.issue.isDeletingComment,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      getIssueComments,
      getRepository,
      getContributors,
      postIssueComment,
      getIssueFromUrl,
      deleteIssueComment,
      getIssueEvents,
    },
    dispatch
  );

const compareCreatedAt = (a, b) => {
  if (a.created_at < b.created_at) {
    return -1;
  } else if (a.created_at > b.created_at) {
    return 1;
  }

  return 0;
};

class Issue extends Component {
  static navigationOptions = ({ navigation, i18n }) => {
    const getHeaderIcon = () => {
      const { state, navigate } = navigation;

      if (state.params.userHasPushPermission) {
        return (
          <Icon
            name="gear"
            color={colors.primaryDark}
            type="octicon"
            containerStyle={{ marginRight: 5 }}
            underlayColor={colors.transparent}
            onPress={() =>
              navigate('IssueSettings', {
                title: i18n.t`Settings`,
                issue: state.params.issue,
              })
            }
          />
        );
      }

      return (
        <Icon
          name="ellipsis-h"
          color={colors.primaryDark}
          type="font-awesome"
          containerStyle={{ marginRight: 10 }}
          underlayColor={colors.transparent}
          onPress={state.params.showActionSheet}
        />
      );
    };

    return { headerRight: getHeaderIcon() };
  };

  props: {
    getIssueComments: Function,
    getRepository: Function,
    getContributors: Function,
    postIssueComment: Function,
    getIssueFromUrl: Function,
    getIssueEvents: Function,
    deleteIssueComment: Function,
    diff: string,
    issue: Object,
    i18n: Object,
    pr: Object,
    isMerged: boolean,
    authUser: Object,
    repository: Object,
    contributors: Array,
    comments: Array,
    events: Array,
    isPendingIssue: boolean,
    isPendingDiff: boolean,
    isPendingCheckMerge: boolean,
    isPendingComments: boolean,
    isPendingEvents: boolean,
    isDeletingComment: boolean,
    isPendingContributors: boolean,
    // isPostingComment: boolean,
    navigation: Object,
  };

  componentDidMount() {
    this.getIssueInformation();

    this.props.navigation.setParams({ showActionSheet: this.showActionSheet });
  }

  onLinkPress = node => {
    const { navigation, authUser } = this.props;

    if (node.attribs.class && node.attribs.class.includes('user-mention')) {
      const login = node.children[0].data.substring(1);

      navigation.navigate(
        authUser.login === login ? 'AuthProfile' : 'Profile',
        {
          user: { login },
        }
      );
    } else if (
      node.attribs.class &&
      node.attribs.class.includes('issue-link')
    ) {
      navigation.navigate('Issue', {
        issueURL: node.attribs.href
          .replace('https://github.com', `${v3.root}/repos`)
          .replace(/pull\/([0-9]+)$/, 'issues/$1'),
      });
    } else {
      Linking.openURL(node.attribs.href);
    }
  };

  onRepositoryPress = url => {
    const { navigation } = this.props;

    navigation.navigate('Repository', {
      repositoryUrl: url,
    });
  };

  getIssueInformation = () => {
    const {
      navigation,
      repository,
      getIssueComments,
      getRepository,
      getContributors,
      getIssueFromUrl,
      getIssueEvents,
    } = this.props;

    const params = navigation.state.params;
    const issueURL = params.issueURL || params.issue.url;
    const issueRepository = issueURL
      .replace(`${v3.root}/repos/`, '')
      .replace(/([^/]+\/[^/]+)\/issues\/\d+$/, '$1');

    Promise.all([
      getIssueFromUrl(issueURL),
      getIssueComments(`${issueURL}/comments`),
    ])
      .then(() => {
        const issue = this.props.issue;

        if (repository.full_name !== issueRepository) {
          return Promise.all([
            getRepository(issue.repository_url),
            getContributors(this.getContributorsLink(issue.repository_url)),
          ]);
        }

        return [];
      })
      .then(() => {
        const { issue, repository } = this.props;

        this.setNavigationParams();

        return getIssueEvents(
          repository.owner.login,
          repository.name,
          issue.number
        );
      });
  };

  getContributorsLink = repository => `${repository}/contributors`;

  setNavigationParams = () => {
    const { navigation, repository } = this.props;

    navigation.setParams({
      userHasPushPermission:
        repository.permissions.admin || repository.permissions.push,
    });
  };

  showActionSheet = () => this.ActionSheet.show();

  handleActionSheetPress = index => {
    if (index === 0) {
      openURLInView(this.props.issue.html_url);
    }
  };

  postComment = body => {
    const { issue, repository } = this.props;

    const repoName = repository.name;
    const owner = repository.owner.login;
    const issueNum = issue.number;

    this.props.postIssueComment(body, owner, repoName, issueNum).then(() => {
      this.commentsList.scrollToEnd();
    });
    Keyboard.dismiss();
  };

  deleteComment = comment => {
    const { repository } = this.props;
    const repoName = repository.name;
    const owner = repository.owner.login;

    this.props.deleteIssueComment(comment.id, owner, repoName);
  };

  editComment = comment => {
    const { navigate } = this.props.navigation;
    const { i18n, repository } = this.props;

    navigate('EditIssueComment', {
      title: i18n.t`Edit Comment`,
      comment,
      repository,
    });
  };

  keyExtractor = (item, index) => {
    return index;
  };

  renderHeader = () => {
    const {
      issue,
      pr,
      diff,
      isMerged,
      isPendingDiff,
      isPendingCheckMerge,
      navigation,
    } = this.props;

    return (
      <IssueDescription
        issue={issue}
        diff={diff}
        isMergeable={pr.mergeable}
        isMerged={isMerged}
        isPendingDiff={isPendingDiff}
        isPendingCheckMerge={isPendingCheckMerge}
        onRepositoryPress={url => this.onRepositoryPress(url)}
        onLinkPress={node => this.onLinkPress(node)}
        userHasPushPermission={navigation.state.params.userHasPushPermission}
        navigation={navigation}
      />
    );
  };

  renderItem = ({ item }) => {
    const { repository, navigation } = this.props;

    if (item.header) {
      return this.renderHeader();
    }

    if (item.event) {
      return (
        <IssueEventListItem
          repository={repository}
          event={item}
          navigation={navigation}
        />
      );
    }

    return (
      <CommentListItem
        comment={item}
        onLinkPress={node => this.onLinkPress(node)}
        onDeletePress={this.deleteComment}
        onEditPress={this.editComment}
        navigation={navigation}
      />
    );
  };

  render() {
    const {
      issue,
      comments,
      contributors,
      isPendingComments,
      isPendingEvents,
      isPendingContributors,
      isPendingIssue,
      isDeletingComment,
      i18n,
      navigation,
    } = this.props;

    const isLoadingData = !!(
      isPendingComments ||
      isPendingIssue ||
      isDeletingComment
    );
    const isShowLoadingContainer =
      isPendingComments || isPendingIssue || isPendingEvents;
    const header = { header: true, created_at: '' };
    const events = formatEventsToRender([...this.props.events]);
    const conversation = !isPendingComments
      ? [header, issue, ...comments, ...events].sort(compareCreatedAt)
      : [header];

    const participantNames = !isPendingComments
      ? conversation.map(item => item && item.user && item.user.login)
      : [];
    const contributorNames = !isPendingContributors
      ? contributors.map(item => item && item.login)
      : [];
    const fullUsers = [
      ...new Set([...participantNames, ...contributorNames]),
    ].filter(item => !!item);

    const issuesActions = [i18n.t`Open in Browser`];

    return (
      <ViewContainer>
        {isShowLoadingContainer && (
          <LoadingContainer animating={isShowLoadingContainer} center />
        )}

        {!isPendingComments &&
          !isPendingIssue &&
          issue && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={'padding'}
              keyboardVerticalOffset={Platform.select({
                ios: 65,
                android: -200,
              })}
            >
              <FlatList
                ref={ref => {
                  this.commentsList = ref;
                }}
                refreshing={isLoadingData}
                onRefresh={this.getIssueInformation}
                contentContainerStyle={{ flexGrow: 1 }}
                removeClippedSubviews={false}
                data={conversation}
                keyExtractor={this.keyExtractor}
                renderItem={this.renderItem}
              />

              <CommentInput
                users={fullUsers}
                userHasPushPermission={
                  navigation.state.params.userHasPushPermission
                }
                issueLocked={issue.locked}
                onSubmit={this.postComment}
              />
            </KeyboardAvoidingView>
          )}

        <ActionSheet
          ref={o => {
            this.ActionSheet = o;
          }}
          title={i18n.t`Issue Actions`}
          options={[...issuesActions, i18n.t`Cancel`]}
          cancelButtonIndex={1}
          onPress={this.handleActionSheetPress}
        />
      </ViewContainer>
    );
  }
}

export const IssueScreen = connect(mapStateToProps, mapDispatchToProps)(
  withI18n()(Issue)
);
