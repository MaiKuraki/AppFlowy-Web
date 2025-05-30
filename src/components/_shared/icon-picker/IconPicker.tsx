import { Popover } from '@/components/_shared/popover';
import { IconColors, randomColor, renderColor } from '@/utils/color';
import { ICON_CATEGORY, loadIcons, randomIcon } from '@/utils/emoji';
import { Button, OutlinedInput } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import React, { useCallback, useEffect } from 'react';
import { ReactComponent as ShuffleIcon } from '@/assets/icons/shuffle.svg';
import { ReactComponent as SearchIcon } from '@/assets/icons/search.svg';
import { useTranslation } from 'react-i18next';
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import DOMPurify from 'dompurify';

const ICONS_PER_ROW = 9;
const ROW_HEIGHT = 42;
const CATEGORY_HEIGHT = 42;

function IconPicker({
  onSelect,
  onEscape,
  size,
}: {
  onSelect: (icon: { value: string; color: string; content: string }) => void;
  onEscape?: () => void;
  size?: [number, number];
}) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectIcon, setSelectIcon] = React.useState<null | string>(null);
  const [icons, setIcons] = React.useState<
    | Record<
        ICON_CATEGORY,
        {
          id: string;
          name: string;
          content: string;
          keywords: string[];
        }[]
      >
    | undefined
  >(undefined);
  const [searchValue, setSearchValue] = React.useState('');
  const filteredIcons = React.useMemo(() => {
    if (!icons) return {};
    if (!searchValue) return icons;
    const filtered = Object.fromEntries(
      Object.entries(icons).map(([category, icons]) => [
        category,
        icons.filter(
          (icon) =>
            icon.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            icon.keywords.some((keyword) => keyword.toLowerCase().includes(searchValue.toLowerCase()))
        ),
      ])
    );

    return filtered;
  }, [icons, searchValue]);

  const rowData = React.useMemo(() => {
    if (!filteredIcons) return [];

    const rows: Array<{
      type: 'category' | 'icons';
      category?: string;
      icons?: Array<{
        id: string;
        name: string;
        content: string;
        keywords: string[];
        cleanSvg: string;
      }>;
    }> = [];

    Object.entries(filteredIcons).forEach(([category, icons]) => {
      if (icons.length === 0) return;

      rows.push({
        type: 'category',
        category: category.replaceAll('_', ' '),
      });

      for (let i = 0; i < icons.length; i += ICONS_PER_ROW) {
        rows.push({
          type: 'icons',
          icons: icons.slice(i, i + ICONS_PER_ROW).map((icon) => ({
            ...icon,
            cleanSvg: DOMPurify.sanitize(
              icon.content.replaceAll('black', 'currentColor').replace('<svg', '<svg width="100%" height="100%"'),
              {
                USE_PROFILES: { svg: true, svgFilters: true },
              }
            ),
          })),
        });
      }
    });

    return rows;
  }, [filteredIcons]);

  const getRowHeight = (index: number) => {
    const row = rowData[index];

    return row.type === 'category' ? CATEGORY_HEIGHT : ROW_HEIGHT;
  };

  useEffect(() => {
    void loadIcons().then(setIcons);
  }, []);

  const Row = useCallback(
    ({ data, index, style }: { data: typeof rowData; index: number; style: React.CSSProperties }) => {
      const row = data[index];

      if (row.type === 'category') {
        return (
          <div style={style} className='mt-2 px-2 text-text-caption'>
            {row.category}
          </div>
        );
      }

      if (!row.icons) return null;

      return (
        <div style={style} className='flex items-center gap-2 px-2'>
          {row.icons.map((icon) => (
            <Tooltip key={icon.id} title={icon.name.replaceAll('-', ' ')}>
              <Button
                size='small'
                color='inherit'
                className='h-8 w-8 min-w-[32px] items-center p-[7px]'
                onClick={(e) => {
                  setSelectIcon(icon.id);
                  setAnchorEl(e.currentTarget);
                }}
              >
                <div className={'h-5 w-5 text-text-title'} dangerouslySetInnerHTML={{ __html: icon.cleanSvg }} />
              </Button>
            </Tooltip>
          ))}
        </div>
      );
    },
    []
  );

  return (
    <div
      style={{
        width: size ? size[0] : undefined,
        height: size ? size[1] : undefined,
      }}
      className={'flex h-[360px] max-h-[70vh] flex-col p-4 pt-2'}
    >
      <div className={'px-0.5 py-2'}>
        <div className={'search-input flex items-end justify-between gap-2'}>
          <OutlinedInput
            startAdornment={<SearchIcon className={'h-5 w-5'} />}
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
            }}
            onKeyUp={(e) => {
              if (e.key === 'Escape' && onEscape) {
                onEscape();
              }
            }}
            autoFocus={true}
            fullWidth={true}
            size={'small'}
            autoCorrect={'off'}
            autoComplete={'off'}
            spellCheck={false}
            inputProps={{
              className: 'px-2 py-1.5 text-base',
            }}
            className={'search-emoji-input'}
            placeholder={t('search.label')}
          />
          <div className={'flex items-center gap-1'}>
            <Tooltip title={t('emoji.random')}>
              <Button
                size={'small'}
                variant={'outlined'}
                color={'inherit'}
                className={'h-9 w-9 min-w-[36px] px-0 py-0'}
                onClick={async () => {
                  const icon = await randomIcon();
                  const color = randomColor(IconColors);

                  onSelect({ value: icon.id, color, content: icon.content });
                }}
              >
                <ShuffleIcon className={'h-5 w-5'} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className={'mt-2 flex flex-1 flex-col gap-2'}>
        <div
          className='flex-1'
          style={{
            width: ICONS_PER_ROW * 40 + 10,
          }}
        >
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <VariableSizeList
                height={height}
                width={width}
                itemCount={rowData.length}
                itemSize={getRowHeight}
                itemData={rowData}
                overscanCount={5}
                className='appflowy-scroller'
              >
                {Row}
              </VariableSizeList>
            )}
          </AutoSizer>
        </div>
        <div className={'pt-2 text-xs text-text-caption'}>
          {t('emoji.openSourceIconsFrom')}
          <a
            href={'https://www.streamlinehq.com/'}
            target={'_blank'}
            rel={'noreferrer'}
            className={'ml-1 text-content-blue-400 underline'}
          >
            Streamline
          </a>
        </div>
      </div>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setAnchorEl(null);
          }
        }}
      >
        <div className={'grid grid-cols-6 gap-1 p-2'}>
          {IconColors.map((color) => (
            <Button
              key={color}
              size={'small'}
              color={'inherit'}
              className={'h-9 w-9 min-w-[36px] px-0 py-0'}
              onClick={() => {
                if (!selectIcon) return;
                const [groupName, iconName] = selectIcon.split('/');

                const category = icons?.[groupName as ICON_CATEGORY];

                if (!category) return;

                const content = category.find((icon) => icon.name === iconName)?.content;

                onSelect({ value: selectIcon, color, content: content || '' });
                setAnchorEl(null);
              }}
            >
              <div style={{ backgroundColor: renderColor(color) }} className={'h-7 w-7 rounded-[8px]'} />
            </Button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

export default IconPicker;
