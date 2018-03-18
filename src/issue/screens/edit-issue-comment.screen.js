// @flow
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Dimensions,
} from 'react-native';
import { ListItem } from 'react-native-elements';
import { withI18n } from '@lingui/react';

import { ViewContainer, SectionList, LoadingModal } from 'components';
import { colors, fonts, normalize } from 'config';
import { editIssueBody, editIssueComment } from '../issue.action';

const styles = StyleSheet.create({
  textInput: {
    paddingVertical: 10,
    fontSize: normalize(12),
    marginHorizontal: 15,
    flex: 1,
    color: colors.black,
    ...fonts.fontPrimary,
  },
  submitTitle: {
    color: colors.green,
    ...fonts.fontPrimary,
  },
  listItemContainer: {
    flex: 1,
  },
  titleSmall: {
    color: colors.primaryDark,
    ...fonts.fontPrimarySemiBold,
    fontSize: normalize(10),
  },
});

const mapStateToProps = state => ({
  issue: state.issue.issue,
  repository: state.repository.repository,
  isEditingComment: state.issue.isEditingComment,
});

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      editIssueBody,
      editIssueComment,
    },
    dispatch
  );

class EditIssueComment extends Component {
  props: {
    editIssueBody: Function,
    editIssueComment: Function,
    i18n: Object,
    repository: Object,
    navigation: Object,
    issue: Object,
    isEditingComment: boolean,
  };

  state: {
    issueComment: string,
    issueCommentHeight: number,
  };

  constructor(props) {
    super(props);

    this.state = {
      issueComment: this.props.navigation.state.params.comment.body,
      issueCommentHeight: 0,
    };
  }

  editComment = () => {
    const { issue, navigation } = this.props;
    const { repository, comment } = this.props.navigation.state.params;

    const repoName = repository.name;
    const owner = repository.owner.login;
    const text = this.state.issueComment;
    const action = comment.repository_url
      ? this.props.editIssueBody(owner, repoName, issue.number, text)
      : this.props.editIssueComment(comment.id, owner, repoName, text);

    action.then(() => navigation.goBack());
  };

  render() {
    const { i18n, isEditingComment } = this.props;
    const { issueComment } = this.state;

    return (
      <ViewContainer>
        {isEditingComment && <LoadingModal />}
        <ScrollView>
          <SectionList title={i18n.t`Issue Comment`}>
            <TextInput
              underlineColorAndroid={'transparent'}
              placeholder={i18n.t`Write a title for your issue here`}
              multiline
              onChangeText={text => this.setState({ issueComment: text })}
              onContentSizeChange={event =>
                this.setState({
                  issueCommentHeight: event.nativeEvent.contentSize.height,
                })
              }
              placeholderTextColor={colors.grey}
              style={[
                styles.textInput,
                {
                  height: this.state.issueCommentHeight,
                  maxHeight: Dimensions.get('window').height / 2,
                },
              ]}
              value={issueComment}
            />
          </SectionList>

          <SectionList>
            <View style={styles.listItemContainer}>
              <ListItem
                title={i18n.t`Submit`}
                hideChevron
                underlayColor={colors.greyLight}
                titleStyle={styles.submitTitle}
                onPress={this.editComment}
              />
            </View>
          </SectionList>
        </ScrollView>
      </ViewContainer>
    );
  }
}

export const EditIssueCommentScreen = connect(
  mapStateToProps,
  mapDispatchToProps
)(withI18n()(EditIssueComment));
