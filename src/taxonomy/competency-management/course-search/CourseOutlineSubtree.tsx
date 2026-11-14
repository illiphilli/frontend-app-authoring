import { type ReactNode, useState } from 'react';

import classNames from 'classnames';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Icon, IconButton } from '@openedx/paragon';
import { AddCircle, ExpandLess, ExpandMore } from '@openedx/paragon/icons';

import { useCourseOutlineIndex } from '@src/course-outline/data';
import type { XBlock } from '@src/data/types';
import CompetencyIcon from '@src/generic/CompetencyIcon';
import { LoadingSpinner } from '@src/generic/Loading';
import { useCompetencyAssociations } from '../CompetencyAssociationsContext';
import DisabledControlTooltip from '../DisabledControlTooltip';
import rootMessages from '../messages';
import messages from './messages';

export interface CourseOutlineSubtreeProps {
  courseId: string;
}

interface BlockedSubsectionRowProps {
  displayName: string;
  isAssociated: boolean;
  competencyExternalId: string | null;
  conflictingCompetencyName: string;
}

/**
 * Row for a graded subsection in a course that another competency blocks (see
 * `SubsectionRow` for when that happens). The competency's pill is grey and has
 * no action icon, and hovering or focusing it shows a tooltip naming the
 * competency that blocks the course. An already associated subsection keeps
 * its filled pill. With no external ID the pill has no readable text, so the
 * wrapper (the row's only focus stop) carries the tooltip text for screen
 * readers instead.
 */
const BlockedSubsectionRow = ({
  displayName,
  isAssociated,
  competencyExternalId,
  conflictingCompetencyName,
}: BlockedSubsectionRowProps) => {
  const intl = useIntl();
  const tooltip = intl.formatMessage(messages.hierarchyConflictTooltip, { competencyName: conflictingCompetencyName });

  return (
    <div
      className={classNames(
        'course-search-browse__subsection course-search-browse__subsection--blocked',
        'd-flex align-items-center justify-content-between',
      )}
    >
      <span>{displayName}</span>
      <DisabledControlTooltip
        tooltip={tooltip}
        placement="left"
        variant="light"
        className="course-search-browse__subsection-pill-tooltip-wrapper"
        tooltipClassName="course-search-browse-blocked-tooltip"
      >
        <span
          className={classNames(
            'course-search-browse__subsection-pill course-search-browse__subsection-pill--blocked',
            `course-search-browse__subsection-pill--${isAssociated ? 'applied' : 'available'}`,
          )}
        >
          {isAssociated && <span className="sr-only">{intl.formatMessage(messages.subsectionAssociatedLabel)}</span>}
          {competencyExternalId && (
            <span className="sr-only">
              {intl.formatMessage(rootMessages.competencyIdAccessibleLabel, { externalId: competencyExternalId })}
            </span>
          )}
          <CompetencyIcon aria-hidden="true" />
          {competencyExternalId && (
            <span className="course-search-browse__subsection-pill-id" aria-hidden="true">
              {competencyExternalId}
            </span>
          )}
        </span>
        {!competencyExternalId && <span className="sr-only">{tooltip}</span>}
      </DisabledControlTooltip>
    </div>
  );
};

interface SubsectionRowProps {
  subsection: XBlock;
  courseId: string;
}

/**
 * One graded subsection: its name plus the competency pill. The applied pill
 * shows regardless of `canEditCourse`.
 *
 * A competency blocks a course when it is an ancestor or descendant of this
 * one in the taxonomy and already has associations in that course. The backend
 * allows only one competency from each ancestor/descendant line per course,
 * because nothing defines whether the parent's own criteria or a rollup of the
 * child's would decide mastery. Sibling competencies don't block each other.
 * In a blocked course the row shows a grey pill with a tooltip naming that
 * competency, in place of the add pill. An already associated subsection
 * keeps its filled pill.
 */
const SubsectionRow = ({ subsection, courseId }: SubsectionRowProps) => {
  const intl = useIntl();
  const {
    associatedObjectIds,
    associateSubsection,
    canEditCourse,
    competencyExternalId,
    conflictingCompetencyName,
    isAssociating,
    status,
  } = useCompetencyAssociations();
  // The `course_index` response populates `.id`, never `.usageKey`.
  const isAssociated = associatedObjectIds.has(subsection.id);
  const canAssociate = status === 'success' && canEditCourse(courseId);
  const conflictingCompetency = canAssociate ? conflictingCompetencyName(courseId) : undefined;

  const pillContent = (
    <>
      <CompetencyIcon aria-hidden="true" />
      {competencyExternalId && (
        <span className="course-search-browse__subsection-pill-id" aria-hidden="true">
          {competencyExternalId}
        </span>
      )}
    </>
  );

  if (conflictingCompetency !== undefined) {
    return (
      <BlockedSubsectionRow
        displayName={subsection.displayName}
        isAssociated={isAssociated}
        competencyExternalId={competencyExternalId}
        conflictingCompetencyName={conflictingCompetency}
      />
    );
  }

  let pill: ReactNode = null;
  if (isAssociated) {
    pill = (
      <span className="course-search-browse__subsection-pill course-search-browse__subsection-pill--applied">
        <span className="sr-only">{intl.formatMessage(messages.subsectionAssociatedLabel)}</span>
        {competencyExternalId && (
          <span className="sr-only">
            {intl.formatMessage(rootMessages.competencyIdAccessibleLabel, { externalId: competencyExternalId })}
          </span>
        )}
        {pillContent}
      </span>
    );
  } else if (canAssociate) {
    const subsectionName = subsection.displayName;
    pill = (
      <Button
        variant="tertiary"
        type="button"
        className="course-search-browse__subsection-pill course-search-browse__subsection-pill--available"
        aria-label={competencyExternalId
          ? intl.formatMessage(messages.associateSubsectionButtonLabel, {
            externalId: competencyExternalId,
            subsectionName,
          })
          : intl.formatMessage(messages.associateSubsectionWithoutIdButtonLabel, { subsectionName })}
        disabled={isAssociating}
        onClick={() => associateSubsection(subsection.id, courseId)}
      >
        {pillContent}
        <span className="course-search-browse__subsection-pill-divider" aria-hidden="true" />
        <Icon src={AddCircle} size="xs" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <div className="course-search-browse__subsection d-flex align-items-center justify-content-between">
      <span>{subsection.displayName}</span>
      {pill}
    </div>
  );
};

const PermissionsError = () => {
  const intl = useIntl();
  const { hasPermissionsError } = useCompetencyAssociations();
  if (!hasPermissionsError) {
    return null;
  }
  return (
    <div role="alert" className="text-danger small">
      {intl.formatMessage(messages.permissionsErrorMessage)}
    </div>
  );
};

interface SectionHeaderProps {
  displayName: string;
  hasGradedSubsection: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * One section (chapter) header: navigation only, never an association
 * target. A section with a graded subsection gets its own disclosure
 * control, starting collapsed; a section with none renders as plain,
 * non-interactive text with no icon.
 */
const SectionHeader = ({
  displayName,
  hasGradedSubsection,
  isExpanded,
  onToggle,
}: SectionHeaderProps) => {
  const intl = useIntl();

  if (!hasGradedSubsection) {
    return <div className="course-search-browse__section-header font-weight-bold small">{displayName}</div>;
  }

  const toggleLabel = isExpanded
    ? intl.formatMessage(messages.collapseSectionButtonLabel)
    : intl.formatMessage(messages.expandSectionButtonLabel);

  return (
    <div className="course-search-browse__section-header font-weight-bold small d-flex align-items-center">
      <IconButton
        src={isExpanded ? ExpandLess : ExpandMore}
        alt={toggleLabel}
        aria-label={toggleLabel}
        aria-expanded={isExpanded}
        size="sm"
        onClick={onToggle}
      />
      <div className="course-search-browse__section-title ml-2">{displayName}</div>
    </div>
  );
};

/**
 * Lazily-fetched course outline shown inside an expanded `CourseRow`.
 *
 * Renders each section as a header, and under it only its graded
 * subsections as rows; ungraded subsections and anything below a
 * subsection (units/verticals) are never rendered.
 */
const CourseOutlineSubtree = ({ courseId }: CourseOutlineSubtreeProps) => {
  const intl = useIntl();
  // Re-expanding a course should not refetch an outline already loaded, even once stale or invalidated.
  const { data, isLoading, isError } = useCourseOutlineIndex(courseId, { refetchOnMount: false });
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set());

  const handleToggleSection = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  let content: ReactNode;
  if (isLoading) {
    content = <LoadingSpinner size="sm" />;
  } else if (isError) {
    content = (
      <div role="alert" className="text-danger small">
        {intl.formatMessage(messages.outlineErrorMessage)}
      </div>
    );
  } else {
    // Computed once per section (rather than filtered separately for
    // `hasGradedSubsection` and for rendering) so both uses stay in sync.
    const sectionsWithGradedSubsections = (data?.courseStructure.childInfo?.children ?? [])
      .filter((block) => block.category === 'chapter')
      .map((section) => ({
        section,
        gradedSubsections: (section.childInfo?.children ?? []).filter(
          (subsection) => subsection.category === 'sequential' && subsection.graded,
        ),
      }));
    const hasGradedSubsection = sectionsWithGradedSubsections.some(
      ({ gradedSubsections }) => gradedSubsections.length > 0,
    );

    if (!hasGradedSubsection) {
      content = <div className="small">{intl.formatMessage(messages.noGradedSubsectionsMessage)}</div>;
    } else {
      const sectionRows = sectionsWithGradedSubsections.map(({ section, gradedSubsections }) => {
        const sectionId = String(section.id);
        const sectionHasGradedSubsection = gradedSubsections.length > 0;
        const isExpanded = expandedSectionIds.has(sectionId);

        return (
          <div key={section.id} className="course-search-browse__group course-search-browse__group--section">
            <SectionHeader
              displayName={section.displayName}
              hasGradedSubsection={sectionHasGradedSubsection}
              isExpanded={isExpanded}
              onToggle={() => handleToggleSection(sectionId)}
            />
            {sectionHasGradedSubsection && isExpanded && gradedSubsections.map((subsection) => (
              <SubsectionRow
                key={subsection.id}
                subsection={subsection}
                courseId={courseId}
              />
            ))}
          </div>
        );
      });
      content = (
        <>
          <PermissionsError />
          {sectionRows}
        </>
      );
    }
  }

  return (
    <div className="course-search-browse__outline pt-2">
      {content}
    </div>
  );
};

export default CourseOutlineSubtree;
