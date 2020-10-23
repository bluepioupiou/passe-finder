<?php
$this->breadcrumbs=array(
	'Videos',
);

$this->menu=array(
	array('label'=>'Create Video', 'url'=>array('create')),
	array('label'=>'Manage Video', 'url'=>array('admin')),
);
Yii::app()->clientScript->registerScript('search',
    "var ajaxUpdateTimeout;
    var ajaxRequest;
    $('input#search').keyup(function(){
        ajaxRequest = $(this).serialize();
        clearTimeout(ajaxUpdateTimeout);
        ajaxUpdateTimeout = setTimeout(function () {
            $.fn.yiiListView.update(
                'yw0',
                {data: ajaxRequest}
            )
        },
        500);
    });"
);
?>

<h1>Vidéos des enchainements</h1>
<b><label for="search">Recherche: </label></b>
<input type="text" id="search" name="search" />
<?php 
	$dataProvider->sort->defaultOrder='t.dateCreate DESC';
	$this->widget('zii.widgets.CListView', array(
	'dataProvider'=>$dataProvider,
	'template'=>"{sorter}{summary}{pager}\n{items}\n{pager}",	
	'sortableAttributes'=>array(
		'name'=>'Nom',
		'dateCreate'=>'creation'
	),
	'itemView'=>'_view',
)); ?>
